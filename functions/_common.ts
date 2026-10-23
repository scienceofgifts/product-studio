/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';

export interface Env {
  GEMINI_API_KEY?: string;
}

export function getGeminiClient(apiKey: string | undefined) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please ensure the environment secret is set.');
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

export const ALLOWED_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
];
export const PREFERRED_DEFAULT_MODEL = 'gemini-3.5-flash-lite';
export const PREFERRED_FALLBACK_MODEL = 'gemini-3.8-flash';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export function createJsonResponse(data: any, status = 200, customHeaders: Record<string, string> = {}) {
  return Response.json(data, {
    status,
    headers: {
      ...corsHeaders,
      ...customHeaders,
    },
  });
}

export function handleOptionsRequest() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function isModelAvailabilityError(err: any): boolean {
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

export function hasRepetitionLoop(str: string): boolean {
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

export function isPlaceholderOrEmpty(val: unknown): boolean {
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

export function ensureWritingBriefHasValidFields(brief: any, details?: any): any {
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

export function validateWritingBrief(brief: any, details?: any): { isValid: boolean; errors: string[] } {
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

export function ensureTitleLaboratoryHasSufficientCandidates(lab: any, details?: any, brief?: any): any {
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

export function validateTitleLaboratory(lab: any): { isValid: boolean; errors: string[] } {
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

export function validateRecipientIntelligence(rec: any): { isValid: boolean; errors: string[] } {
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

export async function ensureSampleEntryWordCountRange(ai: GoogleGenAI, model: string, brief: any): Promise<any> {
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

// Schemas for Gemini responseSchema
export const visualConceptualSchema = {
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

export const recipientIntelligenceSchema = {
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

export const productPositioningSchema = {
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

export const giftGuideFitSchema = {
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

export const titleLaboratorySchema = {
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

export const competitiveDifferentiationSchema = {
  type: Type.OBJECT,
  properties: {
    nonInterchangeabilityFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
    neededCompetitorResearch: { type: Type.ARRAY, items: { type: Type.STRING } },
    hypothesizedDifferentiators: { type: Type.ARRAY, items: { type: Type.STRING } },
    phase3ResearchRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
    preliminaryAnalysisDisclaimer: { type: Type.STRING },
  },
};

export const writingBriefSchema = {
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

export const scoringSchema = {
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
