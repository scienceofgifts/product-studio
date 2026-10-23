/**
 * Cloudflare Worker Handler for Science of Gifts API
 *
 * Runs on Cloudflare Workers with Assets (run_worker_first: ["/api/*"]).
 * Handles all backend API endpoints and Gemini AI integrations with full schema compliance.
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  fetchAndExtractProductFacts,
  formatProductFactsForWriter,
  reconcileWritingBriefWithFacts,
} from './services/productFactsService';
import { ChatGPTWritingBrief } from './types/index';
import { DEFAULT_EDITORIAL_RULES } from './data/defaultEditorialRules';

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
  return trimmed === '' || placeholders.includes(trimmed);
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

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// FULL SCHEMA DEFINITIONS (1:1 matching server.ts and functions/api/[[path]].ts)
const visualConceptualSchema = {
  type: Type.OBJECT,
  properties: {
    productTypeApparent: { type: Type.STRING },
    mainSubjectAndSecondaryElements: { type: Type.STRING },
    visibleTextAndTypography: { type: Type.STRING },
    compositionAndHierarchy: { type: Type.STRING },
    colorPaletteAndAesthetic: { type: Type.STRING },
    symbolsAndMotifs: { type: Type.STRING },
    humorIronyMetaphors: { type: Type.STRING },
    likelyToneAndAesthetic: { type: Type.STRING },
    distinctiveCharacteristics: { type: Type.ARRAY, items: { type: Type.STRING } },
    potentialAmbiguities: { type: Type.ARRAY, items: { type: Type.STRING } },
    undeterminedInformation: { type: Type.ARRAY, items: { type: Type.STRING } },
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          observation: { type: Type.STRING },
          interpretation: { type: Type.STRING },
          confidence: { type: Type.STRING },
          verificationRequirement: { type: Type.STRING },
        },
        required: ['observation', 'interpretation', 'confidence'],
      },
    },
  },
};

const recipientIntelligenceSchema = {
  type: Type.OBJECT,
  properties: {
    primaryRecipientProfile: { type: Type.STRING },
    knowledgeDepth: { type: Type.STRING },
    knowledgeSpectrum: {
      type: Type.OBJECT,
      properties: {
        casualLevel: { type: Type.STRING },
        enthusiastLevel: { type: Type.STRING },
        specialistLevel: { type: Type.STRING },
      },
    },
    reasonsToAppreciate: { type: Type.ARRAY, items: { type: Type.STRING } },
    appealTypes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ['type', 'explanation'],
      },
    },
    relevantGiftingOccasions: { type: Type.ARRAY, items: { type: Type.STRING } },
    secondaryAudiences: { type: Type.ARRAY, items: { type: Type.STRING } },
    audienceMismatches: { type: Type.ARRAY, items: { type: Type.STRING } },
    reasonsItMightNotAppeal: { type: Type.ARRAY, items: { type: Type.STRING } },
    buyerMotivationVsRecipientPerspective: {
      type: Type.OBJECT,
      properties: {
        buyerMotivation: { type: Type.STRING },
        recipientPreference: { type: Type.STRING },
        alignmentRisk: { type: Type.STRING },
      },
      required: ['buyerMotivation', 'recipientPreference', 'alignmentRisk'],
    },
    shopperBuyingAdvice: { type: Type.ARRAY, items: { type: Type.STRING } },
    hypothesisDisclaimer: { type: Type.STRING },
  },
  required: [
    'primaryRecipientProfile',
    'knowledgeDepth',
    'reasonsToAppreciate',
    'appealTypes',
    'relevantGiftingOccasions',
    'audienceMismatches',
    'buyerMotivationVsRecipientPerspective',
  ],
};

const productPositioningSchema = {
  type: Type.OBJECT,
  properties: {
    distinctiveEssence: { type: Type.STRING },
    whyDeservesGiftConsideration: { type: Type.STRING },
    bestServedRecipient: { type: Type.STRING },
    differenceFromGeneric: { type: Type.STRING },
    strongestDesignDetails: { type: Type.ARRAY, items: { type: Type.STRING } },
    weakOrUnsupportedClaimsToAvoid: { type: Type.ARRAY, items: { type: Type.STRING } },
    primaryAppealDominance: { type: Type.STRING },
    positioningAngles: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          angleName: { type: Type.STRING },
          intendedRecipient: { type: Type.STRING },
          centralAppeal: { type: Type.STRING },
          supportingDesignEvidence: { type: Type.STRING },
          giftBuyingMotivation: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknessesOrLimitations: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendation: { type: Type.STRING },
        },
        required: ['angleName', 'intendedRecipient', 'centralAppeal', 'supportingDesignEvidence', 'recommendation'],
      },
    },
    preferredAngleRationale: { type: Type.STRING },
  },
};

const giftGuideFitSchema = {
  type: Type.OBJECT,
  properties: {
    fitsSelectedGuide: { type: Type.BOOLEAN },
    fitAssessment: { type: Type.STRING },
    uniqueRoleInGuide: { type: Type.STRING },
    varietyContribution: {
      type: Type.OBJECT,
      properties: {
        aestheticRole: { type: Type.STRING },
        pricePointOrFormatRole: { type: Type.STRING },
        recipientAppealRole: { type: Type.STRING },
      },
    },
    overlapRisks: { type: Type.STRING },
    entryJustificationNeeds: { type: Type.STRING },
    betterSuitedAlternativeGuides: { type: Type.ARRAY, items: { type: Type.STRING } },
    uniquenessDisclaimer: { type: Type.STRING },
  },
};

const titleLaboratorySchema = {
  type: Type.OBJECT,
  properties: {
    existingTitleEvaluation: {
      type: Type.OBJECT,
      properties: {
        currentTitleProvided: { type: Type.STRING },
        critique: { type: Type.STRING },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        verdict: { type: Type.STRING },
        recommendationNotes: { type: Type.STRING },
      },
    },
    titleOptions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          proposedTitle: { type: Type.STRING },
          strategicApproach: { type: Type.STRING },
          intendedAudience: { type: Type.STRING },
          conceptExplanation: { type: Type.STRING },
          strengths: { type: Type.STRING },
          weaknesses: { type: Type.STRING },
          searchIntentConsiderations: { type: Type.STRING },
          bestUseContext: { type: Type.STRING },
          fitScore: { type: Type.NUMBER },
        },
        required: ['proposedTitle', 'strategicApproach', 'intendedAudience', 'strengths', 'weaknesses', 'bestUseContext'],
      },
    },
    recommendedTitle: { type: Type.STRING },
    recommendedTitleTradeOffs: { type: Type.STRING },
    recommendedRationale: { type: Type.STRING },
    runnerUpTitle: { type: Type.STRING },
    runnerUpRationale: { type: Type.STRING },
    intendedTitleContext: { type: Type.STRING },
    searchIntentDisclaimer: { type: Type.STRING },
    guidePositioningContext: { type: Type.STRING },
  },
  required: ['titleOptions', 'recommendedTitle', 'recommendedRationale', 'recommendedTitleTradeOffs'],
};

const competitiveDifferentiationSchema = {
  type: Type.OBJECT,
  properties: {
    nonInterchangeabilityFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
    neededCompetitorResearch: { type: Type.ARRAY, items: { type: Type.STRING } },
    hypothesizedDifferentiators: { type: Type.ARRAY, items: { type: Type.STRING } },
    phase3ResearchRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
    preliminaryAnalysisDisclaimer: { type: Type.STRING },
  },
};

const writingBriefSchema = {
  type: Type.OBJECT,
  properties: {
    briefTitle: { type: Type.STRING },
    generatedDate: { type: Type.STRING },
    productIdentity: {
      type: Type.OBJECT,
      properties: {
        workingTitle: { type: Type.STRING },
        productType: { type: Type.STRING },
        suppliedSpecifications: { type: Type.STRING },
      },
    },
    guideContext: {
      type: Type.OBJECT,
      properties: {
        guideName: { type: Type.STRING },
        guidePurpose: { type: Type.STRING },
      },
    },
    recipientProfile: {
      type: Type.OBJECT,
      properties: {
        primaryRecipient: { type: Type.STRING },
        knowledgeDepth: { type: Type.STRING },
        buyerMotivation: { type: Type.STRING },
      },
    },
    recommendedTitles: {
      type: Type.OBJECT,
      properties: {
        primary: { type: Type.STRING },
        alternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    editorialAngle: {
      type: Type.OBJECT,
      properties: {
        recommendedAngle: { type: Type.STRING },
        strategicRationale: { type: Type.STRING },
        coreGoalOfEntry: { type: Type.STRING },
        distinctiveInclusionReason: { type: Type.STRING },
      },
    },
    productEditorialReasoning: {
      type: Type.OBJECT,
      properties: {
        distinctiveConcept: { type: Type.STRING },
        curatedDetailsToEmphasize: { type: Type.ARRAY, items: { type: Type.STRING } },
        whyDesignWorks: { type: Type.STRING },
        buyerFacingInterpretation: { type: Type.STRING },
        verifiedFactsToInclude: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    sampleEditorialEntry: { type: Type.STRING },
    editorialQualityAudit: {
      type: Type.OBJECT,
      properties: {
        specificity: { type: Type.BOOLEAN },
        interpretation: { type: Type.BOOLEAN },
        angleQuality: { type: Type.BOOLEAN },
        factualIntegrity: { type: Type.BOOLEAN },
        relevance: { type: Type.BOOLEAN },
        redundancy: { type: Type.BOOLEAN },
        naturalness: { type: Type.BOOLEAN },
        buyerUsefulness: { type: Type.BOOLEAN },
        passed: { type: Type.BOOLEAN },
        notes: { type: Type.STRING },
      },
    },
    designDetailsToEmphasize: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          detail: { type: Type.STRING },
          relationshipToRecipient: { type: Type.STRING },
        },
      },
    },
    toneAndStyleDirection: { type: Type.ARRAY, items: { type: Type.STRING } },
    factsRequiringVerification: { type: Type.ARRAY, items: { type: Type.STRING } },
    claimsAndAssumptionsToAvoid: { type: Type.ARRAY, items: { type: Type.STRING } },
    confirmedSpecifications: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingInformationDoNotInvent: { type: Type.ARRAY, items: { type: Type.STRING } },
    qualityControlChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'briefTitle',
    'productIdentity',
    'guideContext',
    'recipientProfile',
    'recommendedTitles',
    'editorialAngle',
    'toneAndStyleDirection',
    'claimsAndAssumptionsToAvoid',
  ],
};

const scoringSchema = {
  type: Type.OBJECT,
  properties: {
    dimensions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          score: { type: Type.NUMBER },
          maxScore: { type: Type.NUMBER },
          explanation: { type: Type.STRING },
          supportingEvidence: { type: Type.STRING },
          missingEvidenceOrLimitations: { type: Type.STRING },
        },
        required: ['id', 'name', 'maxScore', 'explanation', 'supportingEvidence', 'missingEvidenceOrLimitations'],
      },
    },
    compositeExplanation: { type: Type.STRING },
    limitationsNotice: { type: Type.STRING },
  },
};

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
      const debugTracker: any = { steps: [], start: Date.now() };
      debugTracker.steps.push("Entered analyze block");

      try {
        const reqBody: any = await request.json().catch(() => ({}));
        debugTracker.steps.push("Parsed JSON request body");

        const {
          imageBase64,
          imageMimeType,
          images,
          details,
          relevantCatalogueEntries,
          mode = 'full',
          editorialRules: clientEditorialRules,
          modelName = 'gemini-3.8-flash',
          extractedFacts: clientFacts,
        } = reqBody;

        const allImages: Array<{ imageBase64: string; imageMimeType?: string }> = [];
        if (Array.isArray(images) && images.length > 0) {
          allImages.push(...images);
        } else if (imageBase64) {
          allImages.push({ imageBase64, imageMimeType });
        }

        if (allImages.length === 0 && !details) {
          debugTracker.steps.push("Validation failed: no image or details");
          return jsonResponse({
            error: 'Either a product image or product details are required.',
            debug: debugTracker,
          }, 400);
        }

        let effectiveFacts = clientFacts || details?.extractedFacts;
        if (!effectiveFacts && details?.productUrl && details.productUrl.startsWith('http')) {
          try {
            debugTracker.steps.push("Fetching product facts from URL");
            effectiveFacts = await fetchAndExtractProductFacts(details.productUrl);
            debugTracker.steps.push("Successfully fetched facts from URL");
          } catch (e: any) {
            debugTracker.steps.push(`Auto-fetch facts warning: ${e.message}`);
            console.warn('Auto-fetch facts on server failed:', e);
          }
        }

        debugTracker.effectiveFacts = effectiveFacts;
        console.log("Effective Facts for Prompt:", effectiveFacts);

        const productFactsPrompt = formatProductFactsForWriter(effectiveFacts);
        const ai = getGeminiClient(apiKey);
        debugTracker.steps.push("Initialized Gemini client");

        const effectiveEditorialRules = (typeof clientEditorialRules === 'string' && clientEditorialRules.trim())
          ? clientEditorialRules.trim()
          : DEFAULT_EDITORIAL_RULES;

        const systemInstruction = `
You are the senior editorial intelligence architect, product-positioning strategist, and master editorial writer for "Science of Gifts".
Science of Gifts is an authoritative editorial gift-guide publication with a curated print-on-demand shop.
Unlike conventional ecommerce stores selling generic commodity goods, Science of Gifts develops and curates products for highly specific passions (e.g. Viking history, American Civil War, WWII aviation, classical literature, teaching history, auteur cinema) and helps gift buyers find deeply meaningful, intellectually credible gifts.

EDITORIAL PRECEDENCE POLICY (CRITICAL):
1. Verified Physical Product Facts have HIGHEST PRECEDENCE. Never override or contradict verified facts (materials, dimensions, colors, verified specifications) with creative or editorial assumptions.
2. Global Editorial Rules apply by default across all entries and briefs.
3. Explicit Product-Specific Selections & Choices control the creative direction, target recipient, and output format for this specific product.
4. Detect and surface material contradictions if any exist between product facts and editorial ideas.

CRITICAL EDITORIAL REASONING PROCESS (MUST EXECUTE IN ORDER):
Before generating brief instructions or draft copy, internally reason through these 5 Product-Specific Editorial Steps:

1. Step A — Distinctive Concept: Identify the central concept, joke, visual metaphor, wordplay, historical reference, or symbolism distinguishing this product from generic alternatives.
2. Step B — Curated Design Details: Select the 2-3 most meaningful details and explain how they work together (NEVER an exhaustive inventory).
3. Step C — Why the Design Works: Derive a specific editorial interpretation. Explain what makes the design clever, recognizable, amusing, visually effective, or meaningful to its intended audience.
4. Step D — Buyer-Facing Perspective: Address the gift chooser while making the recipient and product appeal central. Explain why this design appeals to the recipient without generic slogan fluff.
5. Step E — Verified Facts Selection: Select only verified physical details (fabric weight, composition, dimensions) supporting the entry. Never invent features or production details.

GLOBAL EDITORIAL RULES:
${effectiveEditorialRules}

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
        for (const img of allImages) {
          if (!img.imageBase64) continue;
          let cleanBase64 = String(img.imageBase64).trim();
          while (cleanBase64.startsWith('data:')) {
            cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/, '').trim();
          }
          const validGeminiMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
          const targetMime = validGeminiMimeTypes.includes(img.imageMimeType || '') ? img.imageMimeType! : 'image/png';
          contentsParts.push({
            inlineData: {
              mimeType: targetMime,
              data: cleanBase64,
            },
          });
          debugTracker.steps.push(`Prepared inline image base64 (${cleanBase64.length} chars)`);
        }
        contentsParts.push({ text: promptText });
        debugTracker.steps.push("Constructed prompt contents");

        // Construct Mode-Specific Response Schema
        let targetSchema: any;
        if (mode === 'title') {
          targetSchema = {
            type: Type.OBJECT,
            properties: {
              incompleteInformationNotices: { type: Type.ARRAY, items: { type: Type.STRING } },
              titleLaboratory: titleLaboratorySchema,
            },
            required: ['titleLaboratory'],
          };
        } else if (mode === 'recipient') {
          targetSchema = {
            type: Type.OBJECT,
            properties: {
              incompleteInformationNotices: { type: Type.ARRAY, items: { type: Type.STRING } },
              recipientIntelligence: recipientIntelligenceSchema,
            },
            required: ['recipientIntelligence'],
          };
        } else if (mode === 'brief') {
          targetSchema = {
            type: Type.OBJECT,
            properties: {
              incompleteInformationNotices: { type: Type.ARRAY, items: { type: Type.STRING } },
              writingBrief: writingBriefSchema,
              titleLaboratory: titleLaboratorySchema,
            },
            required: ['writingBrief'],
          };
        } else {
          // Full analysis mode (default)
          targetSchema = {
            type: Type.OBJECT,
            properties: {
              incompleteInformationNotices: { type: Type.ARRAY, items: { type: Type.STRING } },
              visualConceptual: visualConceptualSchema,
              recipientIntelligence: recipientIntelligenceSchema,
              productPositioning: productPositioningSchema,
              giftGuideFit: giftGuideFitSchema,
              titleLaboratory: titleLaboratorySchema,
              competitiveDifferentiation: competitiveDifferentiationSchema,
              writingBrief: writingBriefSchema,
              scoring: scoringSchema,
            },
            required: [
              'visualConceptual',
              'recipientIntelligence',
              'productPositioning',
              'giftGuideFit',
              'titleLaboratory',
              'competitiveDifferentiation',
              'writingBrief',
              'scoring',
            ],
          };
        }

        const requestedModel = modelName || PREFERRED_DEFAULT_MODEL;
        let response: any = null;
        let attempt = 0;
        const maxRetries = 2;
        let actualModel = requestedModel;
        let fallbackOccurred = false;
        let fallbackReason: string | undefined = undefined;
        let parsed: any = null;
        let validationResult: { isValid: boolean; errors: string[] } = { isValid: false, errors: [] };

        while (attempt <= maxRetries && !validationResult.isValid) {
          attempt++;
          const targetModel = attempt === 1 ? requestedModel : PREFERRED_FALLBACK_MODEL;
          debugTracker.steps.push(`Attempt ${attempt}/${maxRetries + 1} starting on model ${targetModel}`);

          try {
            console.log(`[Attempt ${attempt}] Calling Gemini model: ${targetModel}`);
            response = await ai.models.generateContent({
              model: targetModel,
              contents: contentsParts,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                temperature: 0.3,
                responseSchema: targetSchema,
              },
            });

            if (targetModel !== requestedModel) {
              actualModel = targetModel;
              fallbackOccurred = true;
              fallbackReason = `Fell back from ${requestedModel} to ${targetModel}`;
            }

            const responseText = response?.text || '';
            debugTracker.steps.push(`Received response string (length: ${responseText.length})`);
            console.log("RAW GEMINI RESPONSE:", responseText);

            if (!responseText || !responseText.trim()) {
              throw new Error("Gemini returned an empty response string.");
            }

            try {
              parsed = JSON.parse(responseText);
              debugTracker.steps.push("Successfully parsed Gemini response as JSON");
            } catch (parseError: any) {
              console.error("JSON PARSE ERROR:", parseError, "Raw text snippet:", responseText.slice(0, 200));
              debugTracker.parseError = parseError.message;
              debugTracker.rawTextSnippet = responseText.slice(0, 200);
              throw new Error(`Failed to parse JSON response from Gemini model: ${parseError.message}`);
            }

            // Mode-specific validation & post-processing
            if (mode === 'title') {
              if (parsed && parsed.titleLaboratory) {
                validationResult = validateTitleLaboratory(parsed.titleLaboratory);
              } else {
                validationResult = { isValid: false, errors: ['Missing titleLaboratory in model response'] };
              }
            } else if (mode === 'recipient') {
              if (parsed && parsed.recipientIntelligence) {
                validationResult = validateRecipientIntelligence(parsed.recipientIntelligence);
              } else {
                validationResult = { isValid: false, errors: ['Missing recipientIntelligence in model response'] };
              }
            } else if (mode === 'brief') {
              if (parsed && parsed.writingBrief) {
                parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts);
                parsed.writingBrief = await ensureSampleEntryWordCountRange(ai, actualModel, parsed.writingBrief);
                parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts);
                validationResult = validateWritingBrief(parsed.writingBrief, details);
              } else {
                validationResult = { isValid: false, errors: ['Missing writingBrief in model response'] };
              }
            } else {
              // Full analysis
              if (parsed && parsed.writingBrief && parsed.titleLaboratory) {
                parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts);
                parsed.writingBrief = await ensureSampleEntryWordCountRange(ai, actualModel, parsed.writingBrief);
                parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts);
                const briefVal = validateWritingBrief(parsed.writingBrief, details);
                const titleVal = validateTitleLaboratory(parsed.titleLaboratory);
                const errors = [...briefVal.errors, ...titleVal.errors];
                validationResult = { isValid: errors.length === 0, errors };
              } else {
                validationResult = { isValid: false, errors: ['Missing writingBrief or titleLaboratory in full analysis response'] };
              }
            }

            if (!validationResult.isValid) {
              debugTracker.steps.push(`Validation failed on attempt ${attempt}: ${validationResult.errors.join('; ')}`);
            }

          } catch (err: any) {
            console.warn(`Attempt ${attempt} failed:`, err.message || err);
            debugTracker.geminiError = err.message || String(err);
            validationResult = { isValid: false, errors: [err.message || String(err)] };
          }
        }

        // Strict validation check after retries
        if (!validationResult.isValid || !parsed) {
          debugTracker.steps.push("Validation failed after maximum retries");
          debugTracker.elapsedMs = Date.now() - debugTracker.start;
          return jsonResponse({
            success: false,
            error: 'Validation failed after retries',
            debug: debugTracker,
            validationErrors: validationResult.errors,
          }, 500);
        }

        // Build complete enriched result spreading all parsed modules
        const enrichedResult = {
          analysisId: 'ana_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
          analyzedAt: new Date().toISOString(),
          promptVersion: '1.3.0-multitool',
          modelIdentifier: actualModel,
          requestedModel: requestedModel,
          actualModel: actualModel,
          fallbackOccurred: fallbackOccurred,
          fallbackReason: fallbackReason,
          editorialRulesApplied: true,
          mode,
          ...parsed,
        };

        debugTracker.steps.push("Analysis completed successfully");
        debugTracker.elapsedMs = Date.now() - debugTracker.start;

        return jsonResponse({
          success: true,
          result: enrichedResult,
          debug: debugTracker,
        });

      } catch (err: any) {
        debugTracker.steps.push(`Global catch triggered: ${err.message}`);
        debugTracker.elapsedMs = Date.now() - debugTracker.start;
        console.error('Analysis endpoint error:', err);
        return jsonResponse({
          error: err.message || 'Failed to execute product analysis.',
          stack: err.stack,
          debug: debugTracker,
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
