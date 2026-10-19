/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  fetchAndExtractProductFacts,
  formatProductFactsForWriter,
  reconcileWritingBriefWithFacts,
} from '../src/services/productFactsService';
import { ChatGPTWritingBrief } from '../src/types/index';

export interface Env {
  GEMINI_API_KEY: string;
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

function getGeminiClient(apiKey: string) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment bindings.');
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

function getCorsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function jsonResponse(data: any, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
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

let modelVerificationCache: {
  lastVerified: string | null;
  results: Record<string, { available: boolean; latencyMs?: number; error?: string }>;
} = {
  lastVerified: null,
  results: {},
};

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
  if (!brief || typeof brief !== 'object') {
    brief = {};
  }

  if (!brief.briefTitle) {
    brief.briefTitle = `Editorial Writing Brief — ${details?.workingName || 'Product Gift'}`;
  }
  if (!brief.generatedDate) {
    brief.generatedDate = new Date().toISOString();
  }

  if (!brief.productIdentity || typeof brief.productIdentity !== 'object') {
    brief.productIdentity = {};
  }
  if (isPlaceholderOrEmpty(brief.productIdentity.workingTitle)) {
    brief.productIdentity.workingTitle = details?.workingName || 'Curated Product Gift';
  }
  if (isPlaceholderOrEmpty(brief.productIdentity.productType)) {
    brief.productIdentity.productType = details?.productType || 'gift';
  }

  if (!brief.guideContext || typeof brief.guideContext !== 'object') {
    brief.guideContext = {};
  }
  if (isPlaceholderOrEmpty(brief.guideContext.guideName)) {
    brief.guideContext.guideName = details?.giftGuideName || 'Science of Gifts Editorial Guide';
  }

  if (!brief.recipientProfile || typeof brief.recipientProfile !== 'object') {
    brief.recipientProfile = {};
  }
  if (isPlaceholderOrEmpty(brief.recipientProfile.primaryRecipient)) {
    brief.recipientProfile.primaryRecipient = details?.primaryRecipient || 'Thoughtful Recipient';
  }

  if (!brief.recommendedTitles || typeof brief.recommendedTitles !== 'object') {
    brief.recommendedTitles = {};
  }
  if (isPlaceholderOrEmpty(brief.recommendedTitles.primary)) {
    brief.recommendedTitles.primary = details?.workingName || 'Curated Editorial Gift Choice';
  }
  if (!Array.isArray(brief.recommendedTitles.alternatives)) {
    brief.recommendedTitles.alternatives = [];
  }

  if (!brief.editorialAngle || typeof brief.editorialAngle !== 'object') {
    brief.editorialAngle = {};
  }
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

  if (isPlaceholderOrEmpty(brief.editorialAngle?.coreGoalOfEntry) || hasRepetitionLoop(brief.editorialAngle?.coreGoalOfEntry)) {
    errors.push('Core Goal of Entry is missing, placeholder, or contains repetition corruption.');
  }

  if (isPlaceholderOrEmpty(brief.editorialAngle?.distinctiveInclusionReason) || hasRepetitionLoop(brief.editorialAngle?.distinctiveInclusionReason)) {
    errors.push('Distinctive Inclusion Reason is missing, placeholder, or contains repetition corruption.');
  }

  const checkStrings = (obj: any, path = '') => {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${k}` : k;
      if (typeof v === 'string') {
        if (v.length > 4000) {
          errors.push(`Field '${currentPath}' exceeds max length (4000 chars).`);
        }
        if (hasRepetitionLoop(v)) {
          errors.push(`Field '${currentPath}' contains repeated nonsense / repetition loop.`);
        }
      } else if (typeof v === 'object' && v !== null) {
        checkStrings(v, currentPath);
      }
    }
  };

  checkStrings(brief);

  return { isValid: errors.length === 0, errors };
}

function ensureTitleLaboratoryHasSufficientCandidates(lab: any, details?: any, brief?: any): any {
  if (!lab || typeof lab !== 'object') {
    lab = {};
  }

  if (!Array.isArray(lab.titleOptions)) {
    lab.titleOptions = [];
  }

  const existingTitlesSet = new Set<string>(
    lab.titleOptions
      .map((opt: any) => (opt && typeof opt.proposedTitle === 'string' ? opt.proposedTitle.trim().toLowerCase() : ''))
      .filter(Boolean)
  );

  const addCandidate = (title: string, approach: string, context: string = 'editorial_guide_heading') => {
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

  if (lab.runnerUpTitle) {
    addCandidate(lab.runnerUpTitle, 'concise_editorial', 'editorial_guide_heading');
  }

  if (brief?.recommendedTitles?.primary) {
    addCandidate(brief.recommendedTitles.primary, 'editorial_framing', 'editorial_guide_heading');
  }

  if (Array.isArray(brief?.recommendedTitles?.alternatives)) {
    for (const alt of brief.recommendedTitles.alternatives) {
      addCandidate(alt, 'recipient_oriented', 'shop_product_page');
    }
  }

  const workingName = details?.workingName || lab.recommendedTitle || 'Product Gift';
  const recipient = details?.primaryRecipient || brief?.recipientProfile?.primaryRecipient || 'Specialist';
  const productType = details?.productType || 'gift';

  const syntheticTemplates = [
    { title: `${workingName}`, approach: 'direct_identification', context: 'shop_product_page' },
    { title: `The ${recipient}'s ${workingName}`, approach: 'recipient_oriented', context: 'editorial_guide_heading' },
    { title: `${workingName} for ${recipient}s`, approach: 'practical_gift_appeal', context: 'shop_product_page' },
    { title: `The ${workingName} Edition`, approach: 'concise_editorial', context: 'editorial_guide_heading' },
    { title: `Curated ${recipient} ${workingName}`, approach: 'specificity_led', context: 'editorial_guide_heading' },
    { title: `${workingName} — ${productType.toUpperCase()} Edition`, approach: 'design_specific', context: 'shop_product_page' },
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
  } else {
    for (const opt of lab.titleOptions) {
      if (isPlaceholderOrEmpty(opt.proposedTitle) || hasRepetitionLoop(opt.proposedTitle)) {
        errors.push('One or more title candidates have empty, placeholder, or corrupted titles.');
      }
    }
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

  if (!rec.buyerMotivationVsRecipientPerspective || isPlaceholderOrEmpty(rec.buyerMotivationVsRecipientPerspective.buyerMotivation)) {
    errors.push('buyerMotivationVsRecipientPerspective is missing or incomplete.');
  }

  return { isValid: errors.length === 0, errors };
}

async function ensureSampleEntryWordCountRange(ai: GoogleGenAI, model: string, brief: ChatGPTWritingBrief): Promise<ChatGPTWritingBrief> {
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

      const revResponse = await ai.models.generateContent({
        model,
        contents: revisionPrompt,
      });

      const revisedText = revResponse.text?.trim();
      if (revisedText) {
        currentEntry = revisedText;
        words = currentEntry.trim().split(/\s+/).filter(Boolean);
        wordCount = words.length;
      }
    } catch (e) {
      console.warn('Targeted word count revision failed:', e);
      break;
    }
  }

  brief.sampleEditorialEntry = currentEntry;
  return brief;
}

export default {
  async fetch(request: Request, env: Env, _ctx: any): Promise<Response> {
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. GET /api/health
      if (path === '/api/health' && request.method === 'GET') {
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

      // 2. GET /api/models
      if (path === '/api/models' && request.method === 'GET') {
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

      // 3. POST /api/models/verify
      if (path === '/api/models/verify' && request.method === 'POST') {
        try {
          const ai = getGeminiClient(env.GEMINI_API_KEY);
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
          return jsonResponse({ error: err.message || 'Failed to verify models.' }, 500, corsHeaders);
        }
      }

      // 4. POST /api/extract-url
      if (path === '/api/extract-url' && request.method === 'POST') {
        try {
          const body = (await request.json()) as any;
          const { url: targetUrl } = body || {};
          if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.trim()) {
            return jsonResponse({ error: 'A valid URL is required.' }, 400, corsHeaders);
          }

          const facts = await fetchAndExtractProductFacts(targetUrl.trim());
          return jsonResponse({ success: true, facts }, 200, corsHeaders);
        } catch (err: any) {
          return jsonResponse(
            { error: err.message || 'Failed to extract product facts from URL.' },
            500,
            corsHeaders
          );
        }
      }

      // 5. POST /api/analyze
      if (path === '/api/analyze' && request.method === 'POST') {
        try {
          const body = (await request.json()) as any;
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
          } = body || {};

          if (!imageBase64 && !details) {
            return jsonResponse({ error: 'Either a product image or product details are required.' }, 400, corsHeaders);
          }

          let effectiveFacts = clientFacts || details?.extractedFacts;
          if (!effectiveFacts && details?.productUrl && details.productUrl.startsWith('http')) {
            try {
              effectiveFacts = await fetchAndExtractProductFacts(details.productUrl);
            } catch (e) {
              console.warn('Auto-fetch facts on worker failed:', e);
            }
          }

          const productFactsPrompt = formatProductFactsForWriter(effectiveFacts);
          const ai = getGeminiClient(env.GEMINI_API_KEY);

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
- Introduce verified specifications naturally as supporting evidence.
- ABSOLUTE PROHIBITIONS:
  * DO NOT use em dashes ("—").
  * DO NOT use generic openings ("Looking for the perfect gift?").
  * DO NOT use empty praise.
  * DO NOT use cliché marketing phrases.
  * DO NOT invent unverified features or historical provenance.

ACTIVE BUSINESS BRAIN CONTEXT (Version ${businessBrain?.version || 1}):
- Business Positioning: ${businessBrain?.businessPositioning || ''}
- Target Audiences: ${businessBrain?.targetAudiences || ''}
- Editorial Rules: ${businessBrain?.editorialVoiceAndRules || ''}
- Gift Guide Philosophy: ${businessBrain?.giftGuidePhilosophy || ''}
- Product Positioning Principles: ${businessBrain?.productPositioningPrinciples || ''}
- SEO Principles: ${businessBrain?.seoPrinciples || ''}
- Historical Accuracy Mandates: ${businessBrain?.historicalCulturalAccuracy || ''}
- Prohibited Patterns: ${businessBrain?.prohibitedPatterns || ''}
- Additional Guidance: ${businessBrain?.additionalInstructions || ''}

${writingGuidelinesContext}

TASK:
Perform structured reasoning for Analysis Mode: "${mode}".
Return a strictly valid JSON object matching the requested schema.
`;

          const catalogueSection = Array.isArray(relevantCatalogueEntries) && relevantCatalogueEntries.length > 0
            ? `
EXISTING RELEVANT CATALOGUE PRODUCTS:
${relevantCatalogueEntries.map((c: any, i: number) => `[Catalogue Item ${i + 1}]: "${c.name}" (${c.productType})`).join('\n')}
`
            : `CATALOGUE INVENTORY NOTICE: No existing catalogue records were matched.`;

          const baseProductPrompt = `
PRODUCT INPUT DETAILS:
- Working Product Name: ${details?.workingName || 'Untitled'}
- Product Type: ${details?.productType || 'unspecified'}
- Gift Guide: ${details?.giftGuideName || 'None selected'}
- Primary Intended Recipient: ${details?.primaryRecipient || 'Unspecified'}
- Secondary Recipient: ${details?.secondaryRecipient || 'None noted'}
- Audience Interest / Niche: ${details?.audienceInterest || 'Unspecified'}
- Gifting Occasion: ${details?.occasion || 'General gift'}
- Existing Product URL: ${details?.productUrl || 'None'}
- Current Title: ${details?.currentTitle || 'None'}
- Current Description: ${details?.currentDescription || 'None'}
- Specifications: ${details?.productSpecs || 'None provided'}
- Known Design References: ${details?.knownDesignReferences || 'None supplied'}
- User Initial Positioning Idea: ${details?.initialPositioningIdea || 'None'}
- Specific Questions or Concerns: ${details?.specificQuestions || 'None'}

${productFactsPrompt}

${catalogueSection}
`;

          let modeSpecificPrompt = `ANALYSIS MODE: ${mode}\nPerform comprehensive analysis.`;

          const promptText = `
Analyze the following product for Science of Gifts:
${baseProductPrompt}
${modeSpecificPrompt}
Ensure every field is thoroughly reasoned, human-sounding, and rigorously grounded in evidence.
`;

          const requestedModel = modelName || PREFERRED_DEFAULT_MODEL;
          if (!ALLOWED_MODELS.includes(requestedModel)) {
            return jsonResponse(
              { error: `Requested model '${requestedModel}' is not in the approved allowlist.` },
              400,
              corsHeaders
            );
          }

          let contentsParts: any[] = [];
          if (imageBase64) {
            let cleanBase64 = String(imageBase64).trim();
            while (cleanBase64.startsWith('data:')) {
              cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/, '').trim();
            }
            const validMime = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'].includes(imageMimeType || '')
              ? imageMimeType
              : 'image/png';
            contentsParts.push({ inlineData: { mimeType: validMime, data: cleanBase64 } });
          }
          contentsParts.push({ text: promptText });

          let response;
          let actualModel = requestedModel;
          let fallbackOccurred = false;
          let fallbackReason: string | undefined = undefined;

          try {
            response = await ai.models.generateContent({
              model: requestedModel,
              contents: contentsParts,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                temperature: 0.4,
              },
            });
          } catch (err: any) {
            if (isModelAvailabilityError(err)) {
              fallbackOccurred = true;
              fallbackReason = `Requested model ${requestedModel} unavailable (${err.message}). Fallback to ${PREFERRED_FALLBACK_MODEL}.`;
              actualModel = PREFERRED_FALLBACK_MODEL;
              response = await ai.models.generateContent({
                model: PREFERRED_FALLBACK_MODEL,
                contents: contentsParts,
                config: {
                  systemInstruction,
                  responseMimeType: 'application/json',
                  temperature: 0.4,
                },
              });
            } else {
              throw err;
            }
          }

          if (!response || !response.text) {
            throw new Error('Gemini API returned an empty response text.');
          }

          const parsed = JSON.parse(response.text);

          const enrichedResult = {
            analysisId: 'ana_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
            analyzedAt: new Date().toISOString(),
            promptVersion: '1.3.0-multitool',
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
          return jsonResponse({ error: err.message || 'An error occurred during product analysis.' }, 500, corsHeaders);
        }
      }

      // 6. POST /api/title-laboratory/generate-more
      if (path === '/api/title-laboratory/generate-more' && request.method === 'POST') {
        try {
          const body = (await request.json()) as any;
          const { details, existingTitles = [], modelName = PREFERRED_DEFAULT_MODEL, count = 6 } = body || {};

          if (!details) {
            return jsonResponse({ error: 'Product details are required to generate titles.' }, 400, corsHeaders);
          }

          const ai = getGeminiClient(env.GEMINI_API_KEY);
          const requestedModel = modelName || PREFERRED_DEFAULT_MODEL;

          const prompt = `
You are the Master Editorial Title Strategist for Science of Gifts.
Generate ${count} MORE distinct, creative title options for the following product appearing in the gift guide "${details.giftGuideName || 'Curated Gift Guide'}":

PRODUCT DETAILS:
- Working Name: ${details.workingName || 'Untitled'}
- Product Type: ${details.productType || 'Item'}
- Guide: ${details.giftGuideName || 'Curated Guide'}
- Primary Recipient: ${details.primaryRecipient || 'Gift Recipient'}
- Audience Interest: ${details.audienceInterest || 'General'}
- Current Title: ${details.currentTitle || 'None'}
- Specifications: ${details.productSpecs || 'None'}
- Known Design References: ${details.knownDesignReferences || 'None'}

EXISTING TITLE CANDIDATES TO AVOID REPEATING:
${existingTitles.map((t: string, i: number) => `${i + 1}. "${t}"`).join('\n')}

Generate ${count} NEW, non-repeating titles using distinct approaches. Return a JSON object with key 'newTitles'.
`;

          const response = await ai.models.generateContent({
            model: requestedModel,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.8,
            },
          });

          if (!response.text) {
            throw new Error('Empty response received from title generation model.');
          }

          const parsed = JSON.parse(response.text);
          return jsonResponse({ success: true, newTitles: parsed.newTitles || [] }, 200, corsHeaders);
        } catch (err: any) {
          return jsonResponse({ error: err.message || 'Failed to generate additional titles.' }, 500, corsHeaders);
        }
      }

      // 7. POST /api/compare
      if (path === '/api/compare' && request.method === 'POST') {
        try {
          const body = (await request.json()) as any;
          const { productA, productB, businessBrain, modelName = 'gemini-3.8-flash' } = body || {};

          if (!productA || !productB) {
            return jsonResponse({ error: 'Both productA and productB are required for comparison.' }, 400, corsHeaders);
          }

          const ai = getGeminiClient(env.GEMINI_API_KEY);
          const systemInstruction = `You are the senior editorial intelligence architect for Science of Gifts. Conduct a multidimensional comparison.`;
          const promptText = `Compare Product A (${productA.details?.workingName}) and Product B (${productB.details?.workingName}). Return JSON.`;

          const requestedModel = modelName || PREFERRED_DEFAULT_MODEL;
          let response;
          try {
            response = await ai.models.generateContent({
              model: requestedModel,
              contents: promptText,
              config: { systemInstruction, responseMimeType: 'application/json', temperature: 0.4 },
            });
          } catch (err: any) {
            if (isModelAvailabilityError(err)) {
              response = await ai.models.generateContent({
                model: PREFERRED_FALLBACK_MODEL,
                contents: promptText,
                config: { systemInstruction, responseMimeType: 'application/json', temperature: 0.4 },
              });
            } else {
              throw err;
            }
          }

          if (!response || !response.text) {
            throw new Error('Comparison model returned empty response.');
          }

          const parsed = JSON.parse(response.text);
          const comparisonKey = [productA.id, productB.id].sort().join('___');

          return jsonResponse(
            {
              success: true,
              result: {
                id: `comp_ai_${comparisonKey}_${Date.now().toString(36)}`,
                comparisonKey,
                productAId: productA.id,
                productAName: productA.details?.workingName || 'Product A',
                productBId: productB.id,
                productBName: productB.details?.workingName || 'Product B',
                engine: 'gemini_multidimensional_v1',
                calculatedAt: new Date().toISOString(),
                ...parsed,
              },
            },
            200,
            corsHeaders
          );
        } catch (err: any) {
          return jsonResponse({ error: err.message || 'Failed to execute comparison.' }, 500, corsHeaders);
        }
      }

      return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Internal Server Error' }, 500, corsHeaders);
    }
  },
};
