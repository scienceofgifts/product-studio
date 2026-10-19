/**
 * Cloudflare Worker Handler for Science of Gifts API
 *
 * Runs on Cloudflare Workers with Assets (run_worker_first: ["/api/*"]).
 * Handles all backend API endpoints and Gemini AI integrations.
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  fetchAndExtractProductFacts,
  formatProductFactsForWriter,
  reconcileWritingBriefWithFacts,
} from './services/productFactsService';
import { ChatGPTWritingBrief } from './types/index';

export interface Env {
  GEMINI_API_KEY?: string;
}

const ALLOWED_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
];
const PREFERRED_DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const PREFERRED_FALLBACK_MODEL = 'gemini-3.8-flash';

// In-memory cache for model verification within worker isolate
let modelVerificationCache: {
  lastVerified: string | null;
  results: Record<string, { available: boolean; latencyMs?: number; error?: string }>;
} = {
  lastVerified: null,
  results: {},
};

function getGeminiClient(apiKey: string | undefined): GoogleGenAI {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please set the secret environment variable in Cloudflare dashboard.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build-worker',
      },
    },
  });
}

function isModelAvailabilityError(err: any): boolean {
  if (!err) return false;
  const message = String(err.message || '').toLowerCase();
  const status = String(err.status || '').toUpperCase();
  const code = Number(err.code || err.status) || 0;

  if (code === 503 || status === 'UNAVAILABLE' || status === '503' || message.includes('503') || message.includes('high demand') || message.includes('temporarily unavailable')) {
    return true;
  }
  if (code === 404 || status === 'NOT_FOUND' || status === '404' || message.includes('404') || message.includes('not found') || message.includes('no longer available')) {
    return true;
  }
  if (message.includes('model is overloaded') || message.includes('spikes in demand') || message.includes('resource exhausted for model')) {
    return true;
  }

  return false;
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');
    const method = request.method.toUpperCase();

    // Handle CORS OPTIONS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const apiKey = env.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);

    // 1. GET /api/health
    if (path === '/api/health' && method === 'GET') {
      const hasKey = Boolean(apiKey);
      return jsonResponse({
        status: 'ok',
        hasApiKey: hasKey,
        defaultModel: PREFERRED_DEFAULT_MODEL,
        fallbackModel: PREFERRED_FALLBACK_MODEL,
        allowedModels: ALLOWED_MODELS,
        serverTime: new Date().toISOString(),
        runtime: 'cloudflare-worker-assets',
      });
    }

    // 2. GET /api/models
    if (path === '/api/models' && method === 'GET') {
      return jsonResponse({
        defaultModel: PREFERRED_DEFAULT_MODEL,
        fallbackModel: PREFERRED_FALLBACK_MODEL,
        allowedModels: ALLOWED_MODELS,
        verification: modelVerificationCache,
      });
    }

    // 3. POST /api/models/verify
    if (path === '/api/models/verify' && method === 'POST') {
      try {
        const ai = getGeminiClient(apiKey);
        const results: Record<string, { available: boolean; latencyMs?: number; error?: string }> = {};

        await Promise.allSettled(
          ALLOWED_MODELS.map(async (model) => {
            const start = Date.now();
            try {
              const pingPromise = ai.models.generateContent({
                model,
                contents: 'ping',
              });
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Ping timed out after 8000ms')), 8000)
              );
              await Promise.race([pingPromise, timeoutPromise]);
              results[model] = {
                available: true,
                latencyMs: Date.now() - start,
              };
            } catch (e: any) {
              results[model] = {
                available: false,
                latencyMs: Date.now() - start,
                error: e.message?.slice(0, 150) || 'Unavailable',
              };
            }
          })
        );

        modelVerificationCache = {
          lastVerified: new Date().toISOString(),
          results,
        };

        return jsonResponse({
          success: true,
          lastVerified: modelVerificationCache.lastVerified,
          results,
        });
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Failed to verify models.' }, 500);
      }
    }

    // 4. POST /api/extract-url
    if (path === '/api/extract-url' && method === 'POST') {
      try {
        const reqBody: any = await request.json().catch(() => ({}));
        const { url: targetUrl } = reqBody;
        if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.trim()) {
          return jsonResponse({ error: 'A valid URL is required.' }, 400);
        }

        const facts = await fetchAndExtractProductFacts(targetUrl.trim());
        return jsonResponse({ success: true, facts });
      } catch (err: any) {
        console.error('URL extraction error:', err);
        return jsonResponse({ error: err.message || 'Failed to extract product facts from URL.' }, 500);
      }
    }

    // 5. POST /api/analyze
    if (path === '/api/analyze' && method === 'POST') {
      try {
        const reqBody: any = await request.json().catch(() => ({}));
        const {
          imageBase64,
          imageMimeType,
          details,
          relevantCatalogueEntries,
          mode = 'full',
          businessBrain,
          writingGuidelines,
          modelName = 'gemini-3.8-flash',
          extractedFacts: clientFacts,
        } = reqBody;

        if (!imageBase64 && !details) {
          return jsonResponse({ error: 'Either a product image or product details are required.' }, 400);
        }

        let effectiveFacts = clientFacts || details?.extractedFacts;
        if (!effectiveFacts && details?.productUrl && details.productUrl.startsWith('http')) {
          try {
            effectiveFacts = await fetchAndExtractProductFacts(details.productUrl);
          } catch (e) {
            console.warn('Auto-fetch facts on server failed:', e);
          }
        }

        // 4. Log the effectiveFacts
        console.log("Effective Facts for Prompt:", effectiveFacts);

        const productFactsPrompt = formatProductFactsForWriter(effectiveFacts);
        const ai = getGeminiClient(apiKey);

        const writingGuidelinesContext = writingGuidelines ? `
ACTIVE WRITING GUIDELINES & STYLE PROFILES:
- Universal Guidelines: ${writingGuidelines.universalGuidelines || ''}
- Voice & Tone: ${writingGuidelines.voiceAndTone || ''}
- Style & Formatting Rules: ${writingGuidelines.styleAndFormatting || ''}
- Things to Avoid: ${writingGuidelines.thingsToAvoid || ''}
- Guardrails: ${writingGuidelines.factualAndEditorialGuardrails || ''}
` : '';

        const systemInstruction = `
You are the senior editorial intelligence architect, product-positioning strategist, and master editorial writer for "Science of Gifts".
Science of Gifts is an authoritative editorial gift-guide publication with a curated print-on-demand shop.

ACTIVE BUSINESS BRAIN CONTEXT (Version ${businessBrain?.version || 1}):
- Business Positioning: ${businessBrain?.businessPositioning || ''}
- Target Audiences: ${businessBrain?.targetAudiences || ''}

${writingGuidelinesContext}

TASK:
Perform structured reasoning for Analysis Mode: "${mode}".
Return a strictly valid JSON object matching the requested schema.
`;

        const baseProductPrompt = `
PRODUCT INPUT DETAILS:
- Working Product Name: ${details?.workingName || 'Untitled'}
- Product Type: ${details?.productType || 'unspecified'}
- Gift Guide: ${details?.giftGuideName || 'None selected'}
- Primary Intended Recipient: ${details?.primaryRecipient || 'Unspecified'}
- Specifications: ${details?.productSpecs || 'None provided'}

${productFactsPrompt}
`;

        const promptText = `
Analyze the following product for Science of Gifts:
${baseProductPrompt}
`;

        const contentsParts: any[] = [];
        if (imageBase64) {
          let cleanBase64 = String(imageBase64).trim();
          while (cleanBase64.startsWith('data:')) {
            cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/, '').trim();
          }
          contentsParts.push({
            inlineData: {
              mimeType: imageMimeType || 'image/png',
              data: cleanBase64,
            },
          });
        }
        contentsParts.push({ text: promptText });

        const requestedModel = modelName || PREFERRED_DEFAULT_MODEL;
        let response: any = null;
        let attempt = 1;
        const maxRetries = 2;
        let lastError: Error | null = null;
        let parsedResult: any = null;

        while (attempt <= maxRetries && !parsedResult) {
          try {
            const targetModel = attempt === 1 ? requestedModel : PREFERRED_FALLBACK_MODEL;
            console.log(`[Attempt ${attempt}/${maxRetries}] Requesting Gemini model: ${targetModel}`);
            response = await ai.models.generateContent({
              model: targetModel,
              contents: contentsParts,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                temperature: 0.3,
              },
            });

            const responseText = response?.text || '';

            // 1. Log the Raw Gemini Response
            console.log("RAW GEMINI RESPONSE:", responseText);

            if (!responseText || !responseText.trim()) {
              throw new Error("Gemini returned an empty response string.");
            }

            // 2. Log JSON Parse Errors
            try {
              parsedResult = JSON.parse(responseText);
            } catch (parseError: any) {
              console.error("JSON PARSE ERROR:", parseError, "Raw text snippet:", responseText.slice(0, 200));
              throw new Error(`Failed to parse JSON response from Gemini model: ${parseError.message}`);
            }

            // Basic validation check on parsedResult
            if (!parsedResult || typeof parsedResult !== 'object' || Object.keys(parsedResult).length === 0) {
              console.error("VALIDATION ERROR: parsedResult is empty or not an object.", parsedResult);
              throw new Error("Gemini returned an empty or invalid JSON object.");
            }

          } catch (err: any) {
            console.warn(`Attempt ${attempt} failed:`, err.message || err);
            lastError = err;
            attempt++;
          }
        }

        // 3. Strict Failure on Retries
        if (!parsedResult) {
          const failureMsg = lastError?.message || "Failed to generate valid analysis from Gemini after maximum retries.";
          console.error("STRICT FAILURE ON RETRIES:", failureMsg);
          return jsonResponse({
            success: false,
            error: failureMsg,
            details: lastError?.stack || undefined,
          }, 500);
        }

        return jsonResponse({
          success: true,
          result: parsedResult,
        });
      } catch (err: any) {
        console.error('Analysis endpoint error:', err);
        return jsonResponse({
          success: false,
          error: err.message || 'Failed to execute product analysis.',
          details: err.stack,
        }, 500);
      }
    }

    // 6. POST /api/compare
    if (path === '/api/compare' && method === 'POST') {
      try {
        const reqBody: any = await request.json().catch(() => ({}));
        const { productA, productB, businessBrain, modelName } = reqBody;

        if (!productA || !productB) {
          return jsonResponse({ error: 'Both productA and productB are required for comparison.' }, 400);
        }

        const ai = getGeminiClient(apiKey);
        const promptText = `Compare Product A (${productA.details?.workingName}) and Product B (${productB.details?.workingName}).`;

        const requestedModel = modelName || PREFERRED_DEFAULT_MODEL;
        const response = await ai.models.generateContent({
          model: requestedModel,
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return jsonResponse({
          success: true,
          result: parsed,
        });
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Comparison failed.' }, 500);
      }
    }

    return jsonResponse({ error: `Endpoint '${path}' not found.` }, 404);
  },
};
