/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { GoogleGenAI, Type } from '@google/genai';
import {
  fetchAndExtractProductFacts,
  formatProductFactsForWriter,
  reconcileWritingBriefWithFacts,
  sanitizeProductSpecsInput,
  sanitizeExtractedFactsForProductType
} from './services/productFactsService.js';
import { ChatGPTWritingBrief } from './types/index.js';
import { DEFAULT_EDITORIAL_RULES } from './data/defaultEditorialRules.js';

type Bindings = {
  GEMINI_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

function getGeminiClient(apiKey: string) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please ensure the secret is set.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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
    'unknown'
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
You write product entries for Science of Gifts, a gift-guide website that helps people choose thoughtful gifts for recipients with specific interests.
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

// Schemas
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

// --- Hono Route Handlers ---

// GET /api/health
app.get('/api/health', (c) => {
  const hasKey = Boolean(c.env.GEMINI_API_KEY);
  return c.json({
    status: 'ok',
    hasApiKey: hasKey,
    defaultModel: PREFERRED_DEFAULT_MODEL,
    fallbackModel: PREFERRED_FALLBACK_MODEL,
    allowedModels: ALLOWED_MODELS,
    serverTime: new Date().toISOString(),
  });
});

// GET /api/models
app.get('/api/models', (c) => {
  return c.json({
    defaultModel: PREFERRED_DEFAULT_MODEL,
    fallbackModel: PREFERRED_FALLBACK_MODEL,
    allowedModels: ALLOWED_MODELS,
    verification: modelVerificationCache,
  });
});

// POST /api/models/verify
app.post('/api/models/verify', async (c) => {
  try {
    const ai = getGeminiClient(c.env.GEMINI_API_KEY);
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

    return c.json({
      success: true,
      lastVerified: modelVerificationCache.lastVerified,
      results,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to verify models.' }, 500);
  }
});

// POST /api/extract-url
app.post('/api/extract-url', async (c) => {
  try {
    const body = await c.req.json();
    const { url } = body || {};
    if (!url || typeof url !== 'string' || !url.trim()) {
      return c.json({ error: 'A valid URL is required.' }, 400);
    }

    const facts = await fetchAndExtractProductFacts(url.trim());
    return c.json({ success: true, facts });
  } catch (err: any) {
    console.error('URL extraction error:', err);
    return c.json({
      error: err.message || 'Failed to extract product facts from URL.',
    }, 500);
  }
});

// POST /api/analyze
app.post('/api/analyze', async (c) => {
  try {
    const body = await c.req.json();
    const {
      imageBase64,
      imageMimeType,
      images,
      details,
      relevantCatalogueEntries,
      mode = 'full',
      editorialRules: clientEditorialRules,
      modelName = 'gemini-3.8-flash',
      extractedFacts: clientFacts
    } = body || {};

    const allImages: Array<{ imageBase64: string; imageMimeType?: string }> = [];
    if (Array.isArray(images) && images.length > 0) {
      allImages.push(...images);
    } else if (imageBase64) {
      allImages.push({ imageBase64, imageMimeType });
    }

    if (allImages.length === 0 && !details) {
      return c.json({ error: 'Either a product image or product details are required.' }, 400);
    }

    let effectiveFacts = clientFacts || details?.extractedFacts;
    if (!effectiveFacts && details?.productUrl && details.productUrl.startsWith('http')) {
      try {
        effectiveFacts = await fetchAndExtractProductFacts(details.productUrl);
      } catch (e) {
        console.warn('Auto-fetch facts on server failed:', e);
      }
    }

    const effectiveProductType = details?.productType || effectiveFacts?.productType?.value;
    effectiveFacts = sanitizeExtractedFactsForProductType(effectiveFacts, effectiveProductType);
    const sanitizedSpecsResult = sanitizeProductSpecsInput(details?.productSpecs, effectiveProductType);
    const sanitizedProductSpecs = sanitizedSpecsResult.cleanedSpecsString;

    const productFactsPrompt = formatProductFactsForWriter(effectiveFacts, effectiveProductType);

    const ai = getGeminiClient(c.env.GEMINI_API_KEY);

    const effectiveEditorialRules = (typeof clientEditorialRules === 'string' && clientEditorialRules.trim())
      ? clientEditorialRules.trim()
      : DEFAULT_EDITORIAL_RULES;

    const systemInstruction = `
You write product entries for Science of Gifts, a gift-guide website that helps people choose thoughtful gifts for recipients with specific interests.
Science of Gifts develops and curates products for highly specific passions (e.g. Viking history, American Civil War, WWII aviation, classical literature, teaching history, content creation) and helps gift buyers find deeply meaningful gifts.

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

    const catalogueSection = Array.isArray(relevantCatalogueEntries) && relevantCatalogueEntries.length > 0
      ? `
EXISTING RELEVANT CATALOGUE PRODUCTS (FOR EDITORIAL & COMPETITIVE DIFFERENTIATION):
${relevantCatalogueEntries.map((c: any, i: number) => `[Catalogue Item ${i + 1}]: "${c.name}" (${c.productType})
  - Guide: ${c.giftGuideName || 'Unassigned'}
  - Primary Recipient: ${c.primaryRecipient || 'Unspecified'}
  - Key Appeal / Notes: ${c.keyAppeal || c.initialPositioningIdea || 'None'}
  ${c.similarityNote ? `- Relationship: ${c.similarityNote}` : ''}`).join('\n')}

CATALOGUE DIFFERENTIATION MANDATE:
- In Module D (Gift Guide Fit), evaluate how this new product fits alongside the existing catalogue products above, identifying whether it introduces fresh variety or risks guide redundancy/cannibalization.
- In Module F (Differentiation) and Module G (ChatGPT Writing Brief), explicitly instruct how this new product differs from the above existing products and what specific angle or evidence the writer must emphasize to avoid repetitive entries.
`
      : `
CATALOGUE INVENTORY NOTICE:
No existing catalogue records were matched or supplied for this niche. Explicitly state in Module D and Module F that catalogue overlap evaluation is based on a clean or unimported baseline.
`;

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
- Specifications: ${sanitizedProductSpecs || 'None provided'}
- Known Design References: ${details?.knownDesignReferences || 'None supplied'}
- User Initial Positioning Idea: ${details?.initialPositioningIdea || 'None'}
- Specific Questions or Concerns: ${details?.specificQuestions || 'None'}

${productFactsPrompt}

${catalogueSection}
`;

    let modeSpecificPrompt = '';
    if (mode === 'title') {
      modeSpecificPrompt = `
ANALYSIS MODE: Title Laboratory
YOUR PRIMARY MISSION:
You are acting exclusively as the Master Editorial Title Strategist and Copy Chief for Science of Gifts.
DO NOT generate a sample editorial entry, lengthy writing brief, or generic filler. Devote your entire analytical depth to title development, candidate generation across distinct strategies, critical evaluation of any existing title, and strategic trade-offs for gift-guide placement.

1. CRITICAL EVALUATION OF EXISTING / CURRENT TITLE:
Current title supplied: "${details?.currentTitle || details?.workingName || 'None provided'}"
Critically evaluate this title:
- What works (if anything)?
- What fails, limits appeal, or risks buyer confusion (e.g. generic commodity phrasing, keyword-stuffed ecommerce jargon, missing the central joke/artwork, confusing to gift shoppers, or lacking editorial distinction)?
- Assign a diagnostic verdict: 'needs_replacement' | 'viable_with_revisions' | 'strong_starting_point' | 'none_provided'.
- Provide actionable notes on how to dramatically improve or replace it.

2. GENERATE AT LEAST 8 TO 10 GENUINELY DISTINCT TITLE CANDIDATES:
Do NOT produce slight variations or re-orderings of the same sentence. Explore meaningfully different editorial angles:
- 'design_specific': focuses specifically on the artwork, inscription, historical crest, visual metaphor, or motif.
- 'recipient_oriented': connects the product directly to a specific kind of person and their identity/role.
- 'intellectual_appeal': emphasizes scholarly knowledge, historical detail, literary reference, or cultural understanding.
- 'witty_irreverent': employs smart humor, dry irony, or wit where the design supports it.
- 'practical_gift_appeal': highlights why this is a thoughtful, delightful gift to receive.
- 'concise_editorial': prioritizes a natural, memorable, punchy editorial headline.
- 'specificity_led': distinguishes the item sharply from generic commodity products.
- 'historical_cultural_reference': grounds the title in authentic historical period, manuscript, or cultural provenance.
- 'direct_identification': clear, unambiguous product name without fluff.
- 'distinctive_concept': highlights the central clever premise.

For EACH candidate:
- proposedTitle: Polished, production-ready title.
- strategicApproach: One of the strategies above.
- intendedAudience: Specific recipient slice targeted.
- conceptExplanation: Clear explanation of what this title emphasizes.
- strengths: Why this title works.
- weaknesses: What trade-offs or risks it carries.
- searchIntentConsiderations: How gift-searchers vs passionate fans will discover it.
- bestUseContext: 'editorial_guide_heading' | 'shop_product_page' | 'seo_title' | 'social_share_heading'.
- fitScore: Score from 1 to 10 evaluating overall fit for Science of Gifts.

3. COMPARATIVE ANALYSIS & RECOMMENDATIONS:
- recommendedTitle: The definitive winning editorial choice for guide publication.
- recommendedRationale: Thorough reasoning explaining why this title wins over all other candidates.
- recommendedTitleTradeOffs: Strategic trade-offs accepted by choosing this recommendation.
- runnerUpTitle: The strongest alternative title.
- runnerUpRationale: Specific scenario where an editor should choose the runner-up instead.
- intendedTitleContext: Clarify whether it serves best as an in-article subheading or standalone item title.
- searchIntentDisclaimer: Guidance on balancing editorial voice with search intent.
- guidePositioningContext: How this title complements the gift guide without sounding repetitive alongside other products.
`;
    } else if (mode === 'recipient') {
      modeSpecificPrompt = `
ANALYSIS MODE: Recipient Intelligence Dossier
YOUR PRIMARY MISSION:
You are acting as the Chief Recipient Psychologist and Gift Intelligence Researcher for Science of Gifts.
DO NOT generate a title matrix, draft editorial copy, or writing brief. Devote your analysis to unpacking the recipient's psyche, passion depth, the dynamic between gift-buyer and recipient, appeal types, gifting occasions, and critical mismatch risks.

REQUIRED RECIPIENT INTELLIGENCE:
1. Primary Recipient Deep Profile: Thorough portrait of the recipient, their lifestyle, identity markers, and aesthetic values.
2. Subject Knowledge Depth Spectrum:
   - casualLevel: What someone with casual appreciation finds enjoyable.
   - enthusiastLevel: What resonates with an active hobbyist or passionate fan.
   - specialistLevel: Scrutiny by a serious academic, specialist, or practitioner (does the item pass muster or cringe?).
3. Buyer Motivation vs. Recipient Perspective (The Gifting Dynamic):
   - buyerMotivation: What the gift-giver thinks they are giving and why they are drawn to it.
   - recipientPreference: What the recipient actually values, notices, and wants to experience.
   - alignmentRisk: Where a well-meaning purchase could feel superficial, cliché, or off-target.
4. Appeal Types: Evaluate intellectual, aesthetic, functional, humorous, sentimental, and identity-based appeal with concrete reasons.
5. AUDIENCE MISMATCHES ("Who NOT to Buy This For"): Crucial warnings identifying who will dislike, misunderstand, or cringe at this item.
6. Reasons it might not appeal or fall flat.
7. Relevant Gifting Occasions & Contexts: Best moments to give this item.
8. Shopper Buying Advice: 3 to 5 practical, actionable tips for the buyer on presentation, sizing, or framing the gift.
`;
    } else if (mode === 'brief') {
      modeSpecificPrompt = `
ANALYSIS MODE: ChatGPT Writing Brief
YOUR PRIMARY MISSION:
You are acting as the Master Editorial Writing Director for Science of Gifts.
Bypass preliminary visual analysis tables and generate a pristine, standalone, production-grade writing brief formatted for ChatGPT to craft the finished editorial entry.

REQUIRED WRITING BRIEF COMPONENTS:
1. Canonical Product Identity & Verified Physical Specifications (strictly deduplicated, verified facts).
2. Guide Context & Recipient Profile.
3. Recommended Titles (Primary editorial title and 2-3 alternatives).
4. Editorial Angle & the 5 Product-Specific Reasoning Steps:
   - Step A: Distinctive Concept distinguishing this product from generic alternatives.
   - Step B: Curated Design Details to emphasize (2-3 most meaningful details).
   - Step C: Why the Design Works (specific editorial interpretation of why it resonates).
   - Step D: Buyer-Facing Interpretation (why this design appeals to the recipient).
   - Step E: Verified Facts to Include naturally.
5. Design Details to Emphasize with their relationship to the recipient.
6. Tone and Style Directives: Perceptive, restrained, scholarly, NO em-dashes ("—"), NO generic slogans.
7. Claims & Assumptions to Avoid.
8. Deterministic QC Checklist.
9. High-Fidelity Reference Sample Editorial Entry (180 to 240 words).
10. Quality Audit: Specificity, interpretation, angle quality, factual integrity, naturalness, buyer usefulness.
`;
    } else {
      modeSpecificPrompt = `
ANALYSIS MODE: Full Analysis
YOUR PRIMARY MISSION:
Perform a comprehensive 360-degree editorial intelligence audit covering all 7 modules:
- Module A: Visual and Conceptual Analysis
- Module B: Recipient Intelligence
- Module C: Product Positioning Angles (preferred, viable, weak)
- Module D: Gift-Guide Fit & Catalogue Differentiation
- Module E: Title Laboratory (8+ diverse options & recommendation)
- Module F: Competitive Differentiation
- Module G: ChatGPT Writing Brief (including 5 reasoning steps & 180-240 word sample entry)
- Scoring: Transparent scores (1-10 or null) across 6 dimensions.
`;
    }

    const promptText = `
Analyze the following product for Science of Gifts:

${baseProductPrompt}

${modeSpecificPrompt}

Ensure every field is thoroughly reasoned, human-sounding, and rigorously grounded in evidence.
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
    }

    contentsParts.push({
      text: promptText,
    });

    const requestedModel = modelName || PREFERRED_DEFAULT_MODEL;
    if (!ALLOWED_MODELS.includes(requestedModel)) {
      return c.json({
        error: `Requested model '${requestedModel}' is not in the approved server-side allowlist. Approved models: ${ALLOWED_MODELS.join(', ')}`,
      }, 400);
    }

    let actualModel = requestedModel;
    let fallbackOccurred = false;
    let fallbackReason: string | undefined = undefined;

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

    const modelConfig = {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.7,
      responseSchema: targetSchema,
    };

    let parsed: any = null;
    let validationResult: { isValid: boolean; errors: string[] } = { isValid: false, errors: [] };
    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries && !validationResult.isValid) {
      attempt++;
      let response: any;
      try {
        response = await ai.models.generateContent({
          model: requestedModel,
          contents: { parts: contentsParts },
          config: modelConfig as any,
        });
      } catch (primaryErr: any) {
        if (isModelAvailabilityError(primaryErr)) {
          console.warn(`Model ${requestedModel} unavailable (${primaryErr.message}). Retrying with fallback model ${PREFERRED_FALLBACK_MODEL}...`);
          await new Promise((r) => setTimeout(r, 1000));
          try {
            response = await ai.models.generateContent({
              model: PREFERRED_FALLBACK_MODEL,
              contents: { parts: contentsParts },
              config: modelConfig as any,
            });
            actualModel = PREFERRED_FALLBACK_MODEL;
            fallbackOccurred = true;
            fallbackReason = `Requested model '${requestedModel}' was unavailable (${primaryErr.message?.slice(0, 100)}). Analysis fell back to '${PREFERRED_FALLBACK_MODEL}'.`;
          } catch (fallbackErr: any) {
            console.warn(`Fallback model ${PREFERRED_FALLBACK_MODEL} also failed. Retrying primary model after delay...`);
            await new Promise((r) => setTimeout(r, 2000));
            response = await ai.models.generateContent({
              model: requestedModel,
              contents: { parts: contentsParts },
              config: modelConfig as any,
            });
          }
        } else {
          throw primaryErr;
        }
      }

      if (!response || !response.text) {
        console.warn(`Attempt ${attempt}: Empty response received from Gemini model.`);
        if (attempt <= maxRetries) {
          continue;
        } else {
          throw new Error('Empty response received from Gemini model after retries.');
        }
      }

      const responseText = response.text;

      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr: any) {
        console.warn(`Attempt ${attempt}: JSON parse failed:`, parseErr.message);
        continue;
      }

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
          parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts, effectiveProductType, sanitizedProductSpecs);
          parsed.writingBrief = await ensureSampleEntryWordCountRange(ai, actualModel, parsed.writingBrief);
          parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts, effectiveProductType, sanitizedProductSpecs);
          validationResult = validateWritingBrief(parsed.writingBrief, details);
          if (!parsed.titleLaboratory && parsed.writingBrief.recommendedTitles?.primary) {
            parsed.titleLaboratory = {
              titleOptions: (parsed.writingBrief.recommendedTitles.alternatives || []).map((t: string) => ({
                proposedTitle: t,
                strategicApproach: 'editorial_framing',
                intendedAudience: parsed.writingBrief.recipientProfile?.primaryRecipient || 'Target Recipient',
                strengths: 'Alternative candidate from writing brief',
                weaknesses: 'Secondary option',
                bestUseContext: 'editorial_guide_heading',
              })),
              recommendedTitle: parsed.writingBrief.recommendedTitles.primary,
              recommendedTitleTradeOffs: 'Selected primary editorial title from writing brief.',
              recommendedRationale: parsed.writingBrief.editorialAngle?.strategicRationale || 'Selected for editorial fit.',
              intendedTitleContext: 'editorial_guide_heading',
              searchIntentDisclaimer: 'Derived from ChatGPT writing brief recommendation.',
            };
          }
        } else {
          validationResult = { isValid: false, errors: ['Missing writingBrief in model response'] };
        }
      } else {
        if (parsed && parsed.writingBrief && parsed.titleLaboratory) {
          parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts, effectiveProductType, sanitizedProductSpecs);
          parsed.writingBrief = await ensureSampleEntryWordCountRange(ai, actualModel, parsed.writingBrief);
          parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts, effectiveProductType, sanitizedProductSpecs);
          const briefVal = validateWritingBrief(parsed.writingBrief, details);
          const titleVal = validateTitleLaboratory(parsed.titleLaboratory);
          const errors = [...briefVal.errors, ...titleVal.errors];
          validationResult = { isValid: errors.length === 0, errors };
        } else {
          validationResult = { isValid: false, errors: ['Missing writingBrief or titleLaboratory in full analysis model response'] };
        }
      }

      if (!validationResult.isValid) {
        console.warn(`Attempt ${attempt} validation failed for mode ${mode}:`, validationResult.errors);
        if (attempt <= maxRetries) {
          console.warn(`Retrying analysis generation due to validation failure...`);
        }
      }
    }

    if (!validationResult.isValid) {
      throw new Error(`Analysis for mode '${mode}' failed integrity checks after ${attempt} attempts: ${validationResult.errors.join('; ')}`);
    }

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

    return c.json({ success: true, result: enrichedResult });
  } catch (err: any) {
    console.error('Analysis error:', err);
    return c.json({
      error: err.message || 'An error occurred during Gemini product analysis.',
      details: err.stack,
    }, 500);
  }
});

// POST /api/title-laboratory/generate-more
app.post('/api/title-laboratory/generate-more', async (c) => {
  try {
    const body = await c.req.json();
    const {
      details,
      existingTitles = [],
      modelName = PREFERRED_DEFAULT_MODEL,
      count = 6,
    } = body || {};

    if (!details) {
      return c.json({ error: 'Product details are required to generate titles.' }, 400);
    }

    const ai = getGeminiClient(c.env.GEMINI_API_KEY);
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
- Specifications: ${sanitizeProductSpecsInput(details.productSpecs, details.productType).cleanedSpecsString || 'None'}
- Known Design References: ${details.knownDesignReferences || 'None'}

EXISTING TITLE CANDIDATES TO AVOID REPEATING:
${existingTitles.map((t: string, i: number) => `${i + 1}. "${t}"`).join('\n')}

Generate ${count} NEW, non-repeating titles using distinct approaches:
- 'design_specific'
- 'recipient_oriented'
- 'intellectual_appeal'
- 'witty_irreverent'
- 'practical_gift_appeal'
- 'concise_editorial'
- 'specificity_led'
- 'historical_cultural_reference'

Return a JSON object with 'newTitles' containing an array of title options matching the schema.
`;

    const response = await ai.models.generateContent({
      model: requestedModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            newTitles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  proposedTitle: { type: Type.STRING },
                  strategicApproach: {
                    type: Type.STRING,
                    enum: [
                      'direct_identification',
                      'recipient_oriented',
                      'distinctive_concept',
                      'historical_cultural_reference',
                      'subtle_humor',
                      'editorial_framing',
                      'design_specific',
                      'intellectual_appeal',
                      'witty_irreverent',
                      'practical_gift_appeal',
                      'concise_editorial',
                      'specificity_led',
                    ],
                  },
                  intendedAudience: { type: Type.STRING },
                  conceptExplanation: { type: Type.STRING },
                  strengths: { type: Type.STRING },
                  weaknesses: { type: Type.STRING },
                  searchIntentConsiderations: { type: Type.STRING },
                  bestUseContext: {
                    type: Type.STRING,
                    enum: ['editorial_guide_heading', 'shop_product_page', 'seo_title', 'social_share_heading'],
                  },
                  fitScore: { type: Type.NUMBER },
                },
                required: ['proposedTitle', 'strategicApproach', 'intendedAudience', 'strengths', 'weaknesses', 'bestUseContext'],
              },
            },
          },
          required: ['newTitles'],
        },
      },
    });

    if (!response.text) {
      throw new Error('Empty response received from title generation model.');
    }

    const parsed = JSON.parse(response.text);
    return c.json({ success: true, newTitles: parsed.newTitles || [] });
  } catch (err: any) {
    console.error('Generate more titles error:', err);
    return c.json({ error: err.message || 'Failed to generate additional titles.' }, 500);
  }
});

// POST /api/compare
app.post('/api/compare', async (c) => {
  try {
    const body = await c.req.json();
    const {
      productA,
      productB,
      businessBrain,
      modelName = 'gemini-3.8-flash',
    } = body || {};

    if (!productA || !productB) {
      return c.json({ error: 'Both productA and productB are required for comparison.' }, 400);
    }

    const ai = getGeminiClient(c.env.GEMINI_API_KEY);

    const systemInstruction = `
You are the senior editorial intelligence architect and product strategist for "Science of Gifts".
Your task is to conduct an explainable, multidimensional comparison between two products in the Science of Gifts catalogue.

CRITICAL SIMILARITY PRINCIPLES:
1. Shared historical subject matter alone MUST NOT establish duplication. Two products can both feature the American Civil War or Viking culture while communicating totally different concepts (e.g. academic primary source citation vs casual humor vs archival cartography).
2. Distinguish conceptual overlap (underlying message, joke, identity appeal) from superficial visual or physical format differences.
3. Categorize into one of 5 distinct categories:
   - "near_duplicate": Same concept and recipient persona; risks catalogue cannibalization.
   - "strongly_overlapping": Substantial overlap in either concept or recipient; requires distinct editorial framing.
   - "distinct_positioning": Same subject/niche, but completely different intellectual appeals or recipient depth.
   - "complementary": Different formats or angles that pair well together in a gift collection.
   - "unrelated": Different subjects and audiences.
4. When information (mockup image, recipient profile, specifications) is missing, explicitly report uncertainty rather than guessing.
5. Provide specific evidence and meaningful differences for each dimension.
`;

    const promptText = `
Compare the following two products across all 6 dimensions:

PRODUCT A:
- Name: ${productA.details?.workingName || 'Untitled'}
- Format / Type: ${productA.details?.productType || 'Unspecified'}
- Assigned Guide: ${productA.details?.giftGuideName || 'Unassigned'}
- Primary Recipient: ${productA.details?.primaryRecipient || 'Unspecified'}
- Secondary Recipient: ${productA.details?.secondaryRecipient || 'None'}
- Niche / Interest: ${productA.details?.audienceInterest || 'Unspecified'}
- Initial Positioning: ${productA.details?.initialPositioningIdea || 'None'}
- Specifications: ${sanitizeProductSpecsInput(productA.details?.productSpecs, productA.details?.productType).cleanedSpecsString || 'None'}
- Design References: ${productA.details?.knownDesignReferences || 'None'}

PRODUCT B:
- Name: ${productB.details?.workingName || 'Untitled'}
- Format / Type: ${productB.details?.productType || 'Unspecified'}
- Assigned Guide: ${productB.details?.giftGuideName || 'Unassigned'}
- Primary Recipient: ${productB.details?.primaryRecipient || 'Unspecified'}
- Secondary Recipient: ${productB.details?.secondaryRecipient || 'None'}
- Niche / Interest: ${productB.details?.audienceInterest || 'Unspecified'}
- Initial Positioning: ${productB.details?.initialPositioningIdea || 'None'}
- Specifications: ${sanitizeProductSpecsInput(productB.details?.productSpecs, productB.details?.productType).cleanedSpecsString || 'None'}
- Design References: ${productB.details?.knownDesignReferences || 'None'}

ACTIVE BUSINESS BRAIN CONTEXT:
Editorial Voice: ${businessBrain?.editorialVoiceAndRules || 'Authoritative, nuanced, respectful'}
Gift Guide Philosophy: ${businessBrain?.giftGuidePhilosophy || 'Curated editorial argument'}

Return a strictly valid JSON object matching the comparison schema.
`;

    const requestedModel = modelName || PREFERRED_DEFAULT_MODEL;
    const compareModelConfig = {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.4,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallCategory: {
            type: Type.STRING,
            enum: ['near_duplicate', 'strongly_overlapping', 'distinct_positioning', 'complementary', 'unrelated'],
          },
          categoryLabel: { type: Type.STRING },
          heuristicScore: { type: Type.NUMBER, description: 'Heuristic similarity estimate 0-100' },
          qualitativeAssessment: { type: Type.STRING },
          positioningImplications: { type: Type.STRING },
          recommendedAction: { type: Type.STRING },
          keySimilarities: { type: Type.ARRAY, items: { type: Type.STRING } },
          keyDifferences: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingInformationWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
          confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          dimensions: {
            type: Type.OBJECT,
            properties: {
              subject: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING, enum: ['identical', 'high', 'moderate', 'low', 'none', 'insufficient_data'] },
                  summary: { type: Type.STRING },
                  specificEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                  meaningfulDifferences: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['level', 'summary', 'specificEvidence', 'meaningfulDifferences'],
              },
              conceptual: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING, enum: ['identical', 'high', 'moderate', 'low', 'none', 'insufficient_data'] },
                  summary: { type: Type.STRING },
                  specificEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                  meaningfulDifferences: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['level', 'summary', 'specificEvidence', 'meaningfulDifferences'],
              },
              visual: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING, enum: ['identical', 'high', 'moderate', 'low', 'none', 'insufficient_data'] },
                  summary: { type: Type.STRING },
                  specificEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                  meaningfulDifferences: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['level', 'summary', 'specificEvidence', 'meaningfulDifferences'],
              },
              recipient: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING, enum: ['identical', 'high', 'moderate', 'low', 'none', 'insufficient_data'] },
                  summary: { type: Type.STRING },
                  specificEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                  meaningfulDifferences: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['level', 'summary', 'specificEvidence', 'meaningfulDifferences'],
              },
              editorial: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING, enum: ['identical', 'high', 'moderate', 'low', 'none', 'insufficient_data'] },
                  summary: { type: Type.STRING },
                  specificEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                  meaningfulDifferences: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['level', 'summary', 'specificEvidence', 'meaningfulDifferences'],
              },
              format: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING, enum: ['identical', 'high', 'moderate', 'low', 'none', 'insufficient_data'] },
                  summary: { type: Type.STRING },
                  specificEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                  meaningfulDifferences: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['level', 'summary', 'specificEvidence', 'meaningfulDifferences'],
              },
            },
            required: ['subject', 'conceptual', 'visual', 'recipient', 'editorial', 'format'],
          },
        },
        required: [
          'overallCategory',
          'categoryLabel',
          'heuristicScore',
          'qualitativeAssessment',
          'positioningImplications',
          'recommendedAction',
          'keySimilarities',
          'keyDifferences',
          'dimensions',
          'confidence',
        ],
      },
    };

    let response: any;
    try {
      response = await ai.models.generateContent({
        model: requestedModel,
        contents: promptText,
        config: compareModelConfig as any,
      });
    } catch (err: any) {
      if (isModelAvailabilityError(err)) {
        console.warn(`Comparison with ${requestedModel} failed, trying ${PREFERRED_FALLBACK_MODEL}...`);
        response = await ai.models.generateContent({
          model: PREFERRED_FALLBACK_MODEL,
          contents: promptText,
          config: compareModelConfig as any,
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

    return c.json({
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
        engine: 'gemini_multidimensional_v1',
        calculatedAt: new Date().toISOString(),
        ...parsed,
      },
    });
  } catch (err: any) {
    console.error('Comparison error:', err);
    return c.json({
      error: err.message || 'Failed to execute multidimensional comparison.',
      details: err.stack,
    }, 500);
  }
});

export default app;
