/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  fetchAndExtractProductFacts,
  formatProductFactsForWriter,
  reconcileWritingBriefWithFacts,
  parseProductFactsFromHtml
} from '../src/services/productFactsService';
import { ChatGPTWritingBrief } from '../src/types';

export interface Env {
  GEMINI_API_KEY?: string;
  ALLOWED_ORIGIN?: string;
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

// In-memory verification cache for worker lifecycle
let modelVerificationCache: {
  lastVerified: string | null;
  results: Record<string, { available: boolean; latencyMs?: number; error?: string }>;
} = {
  lastVerified: null,
  results: {},
};

function getCorsHeaders(request: Request, env: Env): HeadersInit {
  const requestOrigin = request.headers.get('Origin');
  let allowedOrigin = '*';

  if (env.ALLOWED_ORIGIN) {
    allowedOrigin = env.ALLOWED_ORIGIN;
  } else if (requestOrigin) {
    allowedOrigin = requestOrigin;
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data: any, status = 200, corsHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function errorResponse(message: string, status = 500, corsHeaders: HeadersInit = {}): Response {
  return jsonResponse({ error: message }, status, corsHeaders);
}

function isModelAvailabilityError(err: any): boolean {
  if (!err) return false;
  const message = String(err.message || '').toLowerCase();
  const status = String(err.status || '').toUpperCase();
  const code = Number(err.code || err.status) || 0;

  if (
    code === 503 ||
    status === 'UNAVAILABLE' ||
    status === '503' ||
    message.includes('503') ||
    message.includes('high demand') ||
    message.includes('temporarily unavailable')
  ) {
    return true;
  }
  if (
    code === 404 ||
    status === 'NOT_FOUND' ||
    status === '404' ||
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('no longer available')
  ) {
    return true;
  }
  if (
    message.includes('model is overloaded') ||
    message.includes('spikes in demand') ||
    message.includes('resource exhausted for model')
  ) {
    return true;
  }

  return false;
}

/**
 * Validate URL for SSRF protection: block local/loopback, private networks, non-http/https
 */
export function validateAndNormalizeProductUrl(rawUrl: string): { valid: boolean; error?: string; url?: URL } {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: false, error: 'A valid URL is required.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { valid: false, error: 'Invalid URL format provided.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'URL must start with http:// or https://' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and internal domains
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  ) {
    return { valid: false, error: 'Requests to local or loopback destinations are forbidden.' };
  }

  // Check IPv4 private and link-local ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (match) {
    const [_, a, b, c, d] = match.map(Number);
    if (
      a === 127 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a === 0
    ) {
      return { valid: false, error: 'Requests to private network destinations are forbidden.' };
    }
  }

  // Check IPv6 private/link-local
  if (hostname.startsWith('[') || hostname.includes(':')) {
    const cleanIpv6 = hostname.replace(/^\[|\]$/g, '');
    if (
      cleanIpv6 === '::1' ||
      cleanIpv6 === '::' ||
      cleanIpv6.toLowerCase().startsWith('fe80:') ||
      cleanIpv6.toLowerCase().startsWith('fc00:') ||
      cleanIpv6.toLowerCase().startsWith('fd00:')
    ) {
      return { valid: false, error: 'Requests to private IPv6 destinations are forbidden.' };
    }
  }

  return { valid: true, url: parsed };
}

async function callGeminiRestApi(
  apiKey: string,
  modelName: string,
  payload: {
    systemInstruction?: string;
    contents: any[];
    generationConfig?: any;
  }
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const requestBody: any = {
    contents: payload.contents,
  };

  if (payload.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: payload.systemInstruction }],
    };
  }

  if (payload.generationConfig) {
    requestBody.generationConfig = payload.generationConfig;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'science-of-gifts-worker',
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    let errorJson: any;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      // ignore
    }
    const msg = errorJson?.error?.message || errorText || `Gemini API returned HTTP ${res.status}`;
    const errObj: any = new Error(msg);
    errObj.status = res.status;
    throw errObj;
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';
  return { text, rawData: data };
}

function hasRepetitionLoop(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  if (str.length > 5000) return true;
  for (let len = 10; len <= 100; len++) {
    if (str.length < len * 4) continue;
    const sub = str.slice(0, len);
    let count = 0;
    let idx = 0;
    while ((idx = str.indexOf(sub, idx)) !== -1) {
      count++;
      idx += len;
      if (count >= 4) return true;
    }
  }
  return false;
}

function isPlaceholderOrEmpty(val: unknown): boolean {
  if (!val || typeof val !== 'string') return true;
  const trimmed = val.trim().toLowerCase();
  const placeholders = [
    'untitled',
    'default angle',
    'n/a',
    'none noted',
    'unspecified',
    'none',
    'tbd',
    'placeholder',
    'unknown',
  ];
  if (trimmed === '' || placeholders.includes(trimmed)) return true;
  return false;
}

function ensureWritingBriefHasValidFields(brief: any, details?: any): any {
  if (!brief || typeof brief !== 'object') brief = {};

  if (!brief.briefTitle) {
    brief.briefTitle = `Editorial Writing Brief — ${details?.workingName || 'Product Gift'}`;
  }
  if (!brief.generatedDate) {
    brief.generatedDate = new Date().toISOString();
  }

  if (!brief.productIdentity || typeof brief.productIdentity !== 'object') brief.productIdentity = {};
  if (isPlaceholderOrEmpty(brief.productIdentity.workingTitle)) {
    brief.productIdentity.workingTitle = details?.workingName || 'Curated Product Gift';
  }
  if (isPlaceholderOrEmpty(brief.productIdentity.productType)) {
    brief.productIdentity.productType = details?.productType || 'gift';
  }

  if (!brief.guideContext || typeof brief.guideContext !== 'object') brief.guideContext = {};
  if (isPlaceholderOrEmpty(brief.guideContext.guideName)) {
    brief.guideContext.guideName = details?.giftGuideName || 'Science of Gifts Editorial Guide';
  }

  if (!brief.recipientProfile || typeof brief.recipientProfile !== 'object') brief.recipientProfile = {};
  if (isPlaceholderOrEmpty(brief.recipientProfile.primaryRecipient)) {
    brief.recipientProfile.primaryRecipient = details?.primaryRecipient || 'Thoughtful Recipient';
  }

  if (!brief.recommendedTitles || typeof brief.recommendedTitles !== 'object') brief.recommendedTitles = {};
  if (isPlaceholderOrEmpty(brief.recommendedTitles.primary)) {
    brief.recommendedTitles.primary = details?.workingName || 'Curated Editorial Gift Choice';
  }
  if (!Array.isArray(brief.recommendedTitles.alternatives)) {
    brief.recommendedTitles.alternatives = [];
  }

  if (!brief.editorialAngle || typeof brief.editorialAngle !== 'object') brief.editorialAngle = {};
  if (isPlaceholderOrEmpty(brief.editorialAngle.recommendedAngle)) {
    brief.editorialAngle.recommendedAngle = details?.initialPositioningIdea || `Curated gift highlighting high-context appeal for ${brief.recipientProfile.primaryRecipient}.`;
  }
  if (isPlaceholderOrEmpty(brief.editorialAngle.strategicRationale)) {
    brief.editorialAngle.strategicRationale = `Chosen to appeal directly to the interests and recipient profile of ${brief.recipientProfile.primaryRecipient}.`;
  }
  if (isPlaceholderOrEmpty(brief.editorialAngle.coreGoalOfEntry)) {
    brief.editorialAngle.coreGoalOfEntry = `Provide an authoritative, perceptive editorial recommendation demonstrating why this gift resonates with ${brief.recipientProfile.primaryRecipient}.`;
  }
  if (isPlaceholderOrEmpty(brief.editorialAngle.distinctiveInclusionReason)) {
    brief.editorialAngle.distinctiveInclusionReason = `Distinctive design details and tailored context separating this from generic commodity gifts.`;
  }

  return brief;
}

function validateWritingBrief(brief: any, details?: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!brief || typeof brief !== 'object') {
    return { isValid: false, errors: ['writingBrief is missing or not an object'] };
  }

  ensureWritingBriefHasValidFields(brief, details);

  if (isPlaceholderOrEmpty(brief.productIdentity?.workingTitle) || hasRepetitionLoop(brief.productIdentity?.workingTitle)) {
    errors.push('Product workingTitle is missing, placeholder, or contains repetition corruption.');
  }

  if (isPlaceholderOrEmpty(brief.recipientProfile?.primaryRecipient) || hasRepetitionLoop(brief.recipientProfile?.primaryRecipient)) {
    errors.push('Primary Recipient is missing, placeholder, or contains repetition corruption.');
  }

  if (isPlaceholderOrEmpty(brief.recommendedTitles?.primary) || hasRepetitionLoop(brief.recommendedTitles?.primary)) {
    errors.push('Primary Recommended Title is missing, placeholder, or contains repetition corruption.');
  }

  if (isPlaceholderOrEmpty(brief.editorialAngle?.recommendedAngle) || hasRepetitionLoop(brief.editorialAngle?.recommendedAngle)) {
    errors.push('Recommended Angle is missing, placeholder, or contains repetition corruption.');
  }

  if (isPlaceholderOrEmpty(brief.editorialAngle?.strategicRationale) || hasRepetitionLoop(brief.editorialAngle?.strategicRationale)) {
    errors.push('Strategic Rationale is missing, placeholder, or contains repetition corruption.');
  }

  return { isValid: errors.length === 0, errors };
}

function ensureTitleLaboratoryHasSufficientCandidates(lab: any, details?: any, brief?: any): any {
  if (!lab || typeof lab !== 'object') lab = {};
  if (!Array.isArray(lab.titleOptions)) lab.titleOptions = [];

  const existingTitlesSet = new Set<string>(
    lab.titleOptions
      .map((opt: any) => (opt && typeof opt.proposedTitle === 'string' ? opt.proposedTitle.trim().toLowerCase() : ''))
      .filter(Boolean)
  );

  const addCandidate = (title: string, approach: string, context = 'editorial_guide_heading') => {
    if (!title || typeof title !== 'string') return;
    const trimmed = title.trim();
    const lower = trimmed.toLowerCase();
    if (!trimmed || isPlaceholderOrEmpty(trimmed) || existingTitlesSet.has(lower)) return;

    existingTitlesSet.add(lower);
    const recipient = details?.primaryRecipient || brief?.recipientProfile?.primaryRecipient || 'Target Recipient';
    const productType = details?.productType || 'gift';
    lab.titleOptions.push({
      proposedTitle: trimmed,
      strategicApproach: approach,
      intendedAudience: `Gifting for ${recipient}`,
      conceptExplanation: `Editorial title candidate emphasizing ${approach.replace(/_/g, ' ')}.`,
      strengths: `Clear ${approach.replace(/_/g, ' ')} positioning for ${productType}`,
      weaknesses: `Tailored for ${recipient}`,
      searchIntentConsiderations: `High discovery for ${recipient} ${productType} gifts`,
      bestUseContext: context,
      fitScore: 8,
    });
  };

  if (isPlaceholderOrEmpty(lab.recommendedTitle)) {
    if (brief?.recommendedTitles?.primary) {
      lab.recommendedTitle = brief.recommendedTitles.primary;
    } else if (lab.titleOptions.length > 0 && lab.titleOptions[0]?.proposedTitle) {
      lab.recommendedTitle = lab.titleOptions[0].proposedTitle;
    } else if (details?.workingName) {
      lab.recommendedTitle = details.workingName;
    } else {
      lab.recommendedTitle = 'Editorial Gift Choice';
    }
  }

  addCandidate(lab.recommendedTitle, 'editorial_framing', 'editorial_guide_heading');

  const workingName = details?.workingName || lab.recommendedTitle || 'Product Gift';
  const recipient = details?.primaryRecipient || brief?.recipientProfile?.primaryRecipient || 'Specialist';
  const productType = details?.productType || 'gift';

  const syntheticTemplates = [
    { title: `${workingName}`, approach: 'direct_identification', context: 'shop_product_page' },
    { title: `The ${recipient}'s ${workingName}`, approach: 'recipient_oriented', context: 'editorial_guide_heading' },
    { title: `${workingName} for ${recipient}s`, approach: 'practical_gift_appeal', context: 'shop_product_page' },
    { title: `The ${workingName} Edition`, approach: 'concise_editorial', context: 'editorial_guide_heading' },
    { title: `Curated ${recipient} ${workingName}`, approach: 'specificity_led', context: 'editorial_guide_heading' },
  ];

  for (const tmpl of syntheticTemplates) {
    if (lab.titleOptions.length >= 6) break;
    addCandidate(tmpl.title, tmpl.approach, tmpl.context);
  }

  for (const opt of lab.titleOptions) {
    if (!opt.strategicApproach) opt.strategicApproach = 'editorial_framing';
    if (!opt.intendedAudience) opt.intendedAudience = recipient;
    if (!opt.conceptExplanation) opt.conceptExplanation = 'Editorial title candidate';
    if (!opt.strengths) opt.strengths = 'Strong editorial distinction';
    if (!opt.weaknesses) opt.weaknesses = 'Niche context';
    if (!opt.bestUseContext) opt.bestUseContext = 'editorial_guide_heading';
    if (typeof opt.fitScore !== 'number') opt.fitScore = 8;
  }

  return lab;
}

function validateTitleLaboratory(lab: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!lab || typeof lab !== 'object') {
    return { isValid: false, errors: ['titleLaboratory is missing or not an object'] };
  }

  if (isPlaceholderOrEmpty(lab.recommendedTitle) || hasRepetitionLoop(lab.recommendedTitle)) {
    errors.push('Recommended Title is missing, placeholder, or contains repetition corruption.');
  }

  ensureTitleLaboratoryHasSufficientCandidates(lab);

  if (!Array.isArray(lab.titleOptions) || lab.titleOptions.length < 4) {
    errors.push(`titleOptions must contain at least 4 candidates (received ${lab.titleOptions?.length || 0}).`);
  }

  return { isValid: errors.length === 0, errors };
}

function validateRecipientIntelligence(rec: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!rec || typeof rec !== 'object') {
    return { isValid: false, errors: ['recipientIntelligence is missing or not an object'] };
  }

  if (isPlaceholderOrEmpty(rec.primaryRecipientProfile) || hasRepetitionLoop(rec.primaryRecipientProfile)) {
    errors.push('primaryRecipientProfile is missing, placeholder, or contains repetition corruption.');
  }

  return { isValid: errors.length === 0, errors };
}

async function ensureSampleEntryWordCountRange(apiKey: string, model: string, brief: ChatGPTWritingBrief): Promise<ChatGPTWritingBrief> {
  if (!brief.sampleEditorialEntry) return brief;

  let maxRevisions = 2;
  let currentEntry = brief.sampleEditorialEntry;
  let words = currentEntry.trim().split(/\s+/).filter(Boolean);
  let wordCount = words.length;

  while ((wordCount < 180 || wordCount > 240) && maxRevisions > 0) {
    maxRevisions--;
    const direction = wordCount < 180 ? 'expand the prose naturally while retaining all verified facts' : 'condense the prose naturally while retaining all verified facts';

    try {
      const revisionPrompt = `
You are the master editorial writer for Science of Gifts.
The following draft editorial entry has a word count of ${wordCount} words, which violates our required length range of 180 to 240 words (target 210 words).
Please ${direction} to bring the word count strictly between 180 and 240 words.
Rules:
- Length: 180 to 240 words.
- Structure: 2 or 3 paragraphs.
- Open with a sharp concrete observational hook.
- NO em-dashes ("—").
- NO unsupported lifestyle or performance claims.
- Return ONLY the revised editorial entry text as plain text.

Draft Copy to Revise:
"${currentEntry}"
`;

      const revResponse = await callGeminiRestApi(apiKey, model, {
        contents: [{ parts: [{ text: revisionPrompt }] }],
      });

      const revisedText = revResponse.text?.trim();
      if (revisedText) {
        currentEntry = revisedText;
        words = currentEntry.trim().split(/\s+/).filter(Boolean);
        wordCount = words.length;
      }
    } catch (e) {
      break;
    }
  }

  brief.sampleEditorialEntry = currentEntry;
  return brief;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request, env);
    const url = new URL(request.url);
    const path = url.pathname;

    // Preflight OPTIONS handler
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // GET /api/health
    if (request.method === 'GET' && path === '/api/health') {
      const hasKey = Boolean(env.GEMINI_API_KEY);
      return jsonResponse(
        {
          status: 'ok',
          hasApiKey: hasKey,
          defaultModel: PREFERRED_DEFAULT_MODEL,
          fallbackModel: PREFERRED_FALLBACK_MODEL,
          allowedModels: ALLOWED_MODELS,
          serverTime: new Date().toISOString(),
        },
        200,
        corsHeaders
      );
    }

    // GET /api/models
    if (request.method === 'GET' && path === '/api/models') {
      return jsonResponse(
        {
          defaultModel: PREFERRED_DEFAULT_MODEL,
          fallbackModel: PREFERRED_FALLBACK_MODEL,
          allowedModels: ALLOWED_MODELS,
          verification: modelVerificationCache,
        },
        200,
        corsHeaders
      );
    }

    // Check API Key for all remaining routes
    if (!env.GEMINI_API_KEY) {
      return errorResponse('GEMINI_API_KEY is not configured on the Worker environment secrets.', 500, corsHeaders);
    }
    const apiKey = env.GEMINI_API_KEY;

    // POST /api/models/verify
    if (request.method === 'POST' && path === '/api/models/verify') {
      try {
        const results: Record<string, { available: boolean; latencyMs?: number; error?: string }> = {};

        await Promise.allSettled(
          ALLOWED_MODELS.map(async (model) => {
            const start = Date.now();
            try {
              await callGeminiRestApi(apiKey, model, {
                contents: [{ parts: [{ text: 'ping' }] }],
              });
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

        return jsonResponse(
          {
            success: true,
            lastVerified: modelVerificationCache.lastVerified,
            results,
          },
          200,
          corsHeaders
        );
      } catch (err: any) {
        return errorResponse(err.message || 'Failed to verify models.', 500, corsHeaders);
      }
    }

    // POST /api/extract-url
    if (request.method === 'POST' && path === '/api/extract-url') {
      try {
        const body: any = await request.json().catch(() => ({}));
        const rawUrl = body.url;

        // SSRF Validation
        const urlValidation = validateAndNormalizeProductUrl(rawUrl);
        if (!urlValidation.valid || !urlValidation.url) {
          return jsonResponse({ error: urlValidation.error || 'A valid product URL is required.' }, 400, corsHeaders);
        }

        const targetUrl = urlValidation.url.href;

        // Fetch product page safely with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const pageRes = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!pageRes.ok) {
          return jsonResponse(
            {
              success: true,
              facts: {
                retrievalStatus: 'failed',
                sourceUrl: targetUrl,
                retrievalError: `HTTP Error ${pageRes.status}: ${pageRes.statusText}`,
              },
            },
            200,
            corsHeaders
          );
        }

        const html = await pageRes.text();
        if (!html || html.length < 100) {
          return jsonResponse(
            {
              success: true,
              facts: {
                retrievalStatus: 'failed',
                sourceUrl: targetUrl,
                retrievalError: 'Retrieved page was empty or contained insufficient HTML content.',
              },
            },
            200,
            corsHeaders
          );
        }

        const facts = parseProductFactsFromHtml(html, targetUrl);
        return jsonResponse({ success: true, facts }, 200, corsHeaders);
      } catch (err: any) {
        return errorResponse(err.message || 'Failed to extract product facts from URL.', 500, corsHeaders);
      }
    }

    // POST /api/analyze
    if (request.method === 'POST' && path === '/api/analyze') {
      try {
        const body: any = await request.json().catch(() => ({}));
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
        } = body;

        if (!imageBase64 && !details) {
          return jsonResponse({ error: 'Either a product image or product details are required.' }, 400, corsHeaders);
        }

        let effectiveFacts = clientFacts || details?.extractedFacts;

        const productFactsPrompt = formatProductFactsForWriter(effectiveFacts);

        const writingGuidelinesContext = writingGuidelines
          ? `
ACTIVE WRITING GUIDELINES & STYLE PROFILES:
- Universal Guidelines: ${writingGuidelines.universalGuidelines || ''}
- Voice & Tone: ${writingGuidelines.voiceAndTone || ''}
- Style & Formatting Rules: ${writingGuidelines.styleAndFormatting || ''}
- Things to Avoid: ${writingGuidelines.thingsToAvoid || ''}
- Guardrails: ${writingGuidelines.factualAndEditorialGuardrails || ''}
`
          : '';

        const systemInstruction = `
You are the senior editorial intelligence architect, product-positioning strategist, and master editorial writer for "Science of Gifts".
Science of Gifts is an authoritative editorial gift-guide publication with a curated print-on-demand shop.
Unlike conventional ecommerce stores selling generic commodity goods, Science of Gifts develops and curates products for highly specific passions and helps gift buyers find deeply meaningful, intellectually credible gifts.

CRITICAL EDITORIAL REASONING PROCESS (MUST EXECUTE IN ORDER):
Before generating brief instructions or draft copy, internally reason through these 5 Product-Specific Editorial Steps:
1. Step A — Distinctive Concept
2. Step B — Curated Design Details
3. Step C — Why the Design Works
4. Step D — Buyer-Facing Perspective
5. Step E — Verified Facts Selection

EDITORIAL PROSE RULES (CRITICAL):
- Write natural, perceptive, human-sounding editorial prose.
- Begin with a concrete observation or interpretation specific to the product.
- Move from observed details to a meaningful explanation of why they work.
- NO em-dashes ("—").
- NO generic openings.

ACTIVE BUSINESS BRAIN CONTEXT (Version ${businessBrain?.version || 1}):
- Business Positioning: ${businessBrain?.businessPositioning || ''}
- Target Audiences: ${businessBrain?.targetAudiences || ''}
- Editorial Rules: ${businessBrain?.editorialVoiceAndRules || ''}

${writingGuidelinesContext}

TASK:
Perform structured reasoning for Analysis Mode: "${mode}".
Return a strictly valid JSON object.
`;

        const baseProductPrompt = `
PRODUCT INPUT DETAILS:
- Working Product Name: ${details?.workingName || 'Untitled'}
- Product Type: ${details?.productType || 'unspecified'}
- Gift Guide: ${details?.giftGuideName || 'None selected'}
- Primary Intended Recipient: ${details?.primaryRecipient || 'Unspecified'}
- Audience Interest / Niche: ${details?.audienceInterest || 'Unspecified'}

${productFactsPrompt}
`;

        const contentsParts: any[] = [];
        if (imageBase64) {
          let cleanBase64 = String(imageBase64).trim();
          while (cleanBase64.startsWith('data:')) {
            cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/, '').trim();
          }
          const validMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
          const targetMime = validMimes.includes(imageMimeType || '') ? imageMimeType : 'image/png';

          contentsParts.push({
            inlineData: {
              mimeType: targetMime,
              data: cleanBase64,
            },
          });
        }

        contentsParts.push({
          text: `Analyze the following product for Science of Gifts:\n${baseProductPrompt}\nMode: ${mode}`,
        });

        const requestedModel = ALLOWED_MODELS.includes(modelName) ? modelName : PREFERRED_DEFAULT_MODEL;

        let responseText = '';
        let actualModel = requestedModel;
        let fallbackOccurred = false;
        let fallbackReason: string | undefined = undefined;

        try {
          const res = await callGeminiRestApi(apiKey, requestedModel, {
            systemInstruction,
            contents: [{ parts: contentsParts }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          });
          responseText = res.text;
        } catch (primaryErr: any) {
          if (isModelAvailabilityError(primaryErr)) {
            const fallbackRes = await callGeminiRestApi(apiKey, PREFERRED_FALLBACK_MODEL, {
              systemInstruction,
              contents: [{ parts: contentsParts }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.7,
              },
            });
            responseText = fallbackRes.text;
            actualModel = PREFERRED_FALLBACK_MODEL;
            fallbackOccurred = true;
            fallbackReason = `Requested model '${requestedModel}' was unavailable. Fallback to '${PREFERRED_FALLBACK_MODEL}'.`;
          } else {
            throw primaryErr;
          }
        }

        if (!responseText) {
          return errorResponse('Empty response received from Gemini model.', 500, corsHeaders);
        }

        let parsed: any = null;
        try {
          parsed = JSON.parse(responseText);
        } catch (e: any) {
          return errorResponse(`Failed to parse model output JSON: ${e.message}`, 500, corsHeaders);
        }

        if (mode === 'brief' || mode === 'full') {
          if (parsed?.writingBrief) {
            parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts);
            parsed.writingBrief = await ensureSampleEntryWordCountRange(apiKey, actualModel, parsed.writingBrief);
            parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts);
          }
        }

        const enrichedResult = {
          analysisId: 'ana_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
          analyzedAt: new Date().toISOString(),
          promptVersion: '1.3.0-worker',
          modelIdentifier: actualModel,
          requestedModel,
          actualModel,
          fallbackOccurred,
          fallbackReason,
          businessBrainVersion: businessBrain?.version || 1,
          mode,
          ...parsed,
        };

        return jsonResponse({ success: true, result: enrichedResult }, 200, corsHeaders);
      } catch (err: any) {
        return errorResponse(err.message || 'An error occurred during Gemini product analysis.', 500, corsHeaders);
      }
    }

    // POST /api/title-laboratory/generate-more
    if (request.method === 'POST' && path === '/api/title-laboratory/generate-more') {
      try {
        const body: any = await request.json().catch(() => ({}));
        const { details, existingTitles = [], modelName = PREFERRED_DEFAULT_MODEL, count = 6 } = body;

        if (!details) {
          return jsonResponse({ error: 'Product details are required to generate titles.' }, 400, corsHeaders);
        }

        const requestedModel = ALLOWED_MODELS.includes(modelName) ? modelName : PREFERRED_DEFAULT_MODEL;

        const prompt = `
You are the Master Editorial Title Strategist for Science of Gifts.
Generate ${count} MORE distinct, creative title options for the following product appearing in the gift guide "${details.giftGuideName || 'Curated Gift Guide'}":

PRODUCT DETAILS:
- Working Name: ${details.workingName || 'Untitled'}
- Product Type: ${details.productType || 'Item'}
- Guide: ${details.giftGuideName || 'Curated Guide'}
- Primary Recipient: ${details.primaryRecipient || 'Gift Recipient'}

EXISTING TITLE CANDIDATES TO AVOID REPEATING:
${existingTitles.map((t: string, i: number) => `${i + 1}. "${t}"`).join('\n')}

Return a JSON object with 'newTitles' array containing title candidate objects:
{
  "newTitles": [
    {
      "proposedTitle": "...",
      "strategicApproach": "editorial_framing",
      "intendedAudience": "...",
      "conceptExplanation": "...",
      "strengths": "...",
      "weaknesses": "...",
      "bestUseContext": "editorial_guide_heading",
      "fitScore": 8
    }
  ]
}
`;

        const res = await callGeminiRestApi(apiKey, requestedModel, {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.8,
          },
        });

        if (!res.text) {
          return errorResponse('Empty response received from title generation model.', 500, corsHeaders);
        }

        const parsed = JSON.parse(res.text);
        return jsonResponse({ success: true, newTitles: parsed.newTitles || [] }, 200, corsHeaders);
      } catch (err: any) {
        return errorResponse(err.message || 'Failed to generate additional titles.', 500, corsHeaders);
      }
    }

    // POST /api/compare
    if (request.method === 'POST' && path === '/api/compare') {
      try {
        const body: any = await request.json().catch(() => ({}));
        const { productA, productB, businessBrain, modelName = 'gemini-3.8-flash' } = body;

        if (!productA || !productB) {
          return jsonResponse({ error: 'Both productA and productB are required for comparison.' }, 400, corsHeaders);
        }

        const requestedModel = ALLOWED_MODELS.includes(modelName) ? modelName : PREFERRED_DEFAULT_MODEL;

        const systemInstruction = `
You are the senior editorial intelligence architect and product strategist for "Science of Gifts".
Conduct an explainable, multidimensional comparison between two products in the Science of Gifts catalogue.

Categorize into one of 5 distinct categories:
- "near_duplicate"
- "strongly_overlapping"
- "distinct_positioning"
- "complementary"
- "unrelated"

Return a strictly valid JSON object matching the comparison schema.
`;

        const promptText = `
Compare the following two products:

PRODUCT A:
- Name: ${productA.details?.workingName || 'Untitled'}
- Type: ${productA.details?.productType || 'Unspecified'}
- Guide: ${productA.details?.giftGuideName || 'Unassigned'}
- Primary Recipient: ${productA.details?.primaryRecipient || 'Unspecified'}

PRODUCT B:
- Name: ${productB.details?.workingName || 'Untitled'}
- Type: ${productB.details?.productType || 'Unspecified'}
- Guide: ${productB.details?.giftGuideName || 'Unassigned'}
- Primary Recipient: ${productB.details?.primaryRecipient || 'Unspecified'}

Return a JSON object with: overallCategory, categoryLabel, heuristicScore, qualitativeAssessment, positioningImplications, recommendedAction, keySimilarities, keyDifferences, confidence, and dimensions.
`;

        let res;
        try {
          res = await callGeminiRestApi(apiKey, requestedModel, {
            systemInstruction,
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.4,
            },
          });
        } catch (err: any) {
          if (isModelAvailabilityError(err)) {
            res = await callGeminiRestApi(apiKey, PREFERRED_FALLBACK_MODEL, {
              systemInstruction,
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.4,
              },
            });
          } else {
            throw err;
          }
        }

        if (!res.text) {
          return errorResponse('Comparison model returned empty response.', 500, corsHeaders);
        }

        const parsed = JSON.parse(res.text);
        const comparisonKey = [productA.id, productB.id].sort().join('___');

        return jsonResponse(
          {
            success: true,
            result: {
              id: `comp_ai_${comparisonKey}_${Date.now().toString(36)}`,
              comparisonKey,
              productAId: productA.id,
              productAName: productA.details?.workingName || 'Product A',
              productAFormat: productA.details?.productType,
              productAGuide: productA.details?.giftGuideName,
              productBId: productB.id,
              productBName: productB.details?.workingName || 'Product B',
              productBFormat: productB.details?.productType,
              productBGuide: productB.details?.giftGuideName,
              engine: 'gemini_multidimensional_worker_v1',
              calculatedAt: new Date().toISOString(),
              ...parsed,
            },
          },
          200,
          corsHeaders
        );
      } catch (err: any) {
        return errorResponse(err.message || 'Failed to execute multidimensional comparison.', 500, corsHeaders);
      }
    }

    return jsonResponse({ error: `Route not found: ${request.method} ${path}` }, 404, corsHeaders);
  },
};
