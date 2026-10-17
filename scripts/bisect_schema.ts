import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
          confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
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
          type: { type: Type.STRING, enum: ['functional', 'aesthetic', 'intellectual', 'humorous', 'sentimental', 'identity-based'] },
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
    primaryAppealDominance: { type: Type.STRING, enum: ['functional', 'aesthetic', 'intellectual', 'humorous', 'sentimental', 'identity-based'] },
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
          recommendation: { type: Type.STRING, enum: ['preferred', 'viable', 'weak'] },
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
        verdict: {
          type: Type.STRING,
          enum: ['needs_replacement', 'viable_with_revisions', 'strong_starting_point', 'none_provided'],
        },
        recommendationNotes: { type: Type.STRING },
      },
    },
    titleOptions: {
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
        distinctiveConcept: { type: Type.STRING, description: 'Step A: Central concept, joke, visual metaphor, or historical reference distinguishing this item.' },
        curatedDetailsToEmphasize: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Step B: The 2-3 most meaningful design details and how they work together.' },
        whyDesignWorks: { type: Type.STRING, description: 'Step C: Specific editorial interpretation explaining why the design is clever or meaningful to its audience.' },
        buyerFacingInterpretation: { type: Type.STRING, description: 'Step D: Gift-buyer perspective explaining why this particular design appeals to the recipient.' },
        verifiedFactsToInclude: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Step E: Verified physical specifications supporting the entry.' },
      },
    },
    sampleEditorialEntry: {
      type: Type.STRING,
      description: 'Polished 2-3 paragraph reference editorial entry written for publication following the reasoning steps.',
    },
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

const allModules: Record<string, any> = {
  visualConceptual: visualConceptualSchema,
  recipientIntelligence: recipientIntelligenceSchema,
  productPositioning: productPositioningSchema,
  giftGuideFit: giftGuideFitSchema,
  titleLaboratory: titleLaboratorySchema,
  competitiveDifferentiation: competitiveDifferentiationSchema,
  writingBrief: writingBriefSchema,
  scoring: scoringSchema,
};

async function testDimensions() {
  const baseModules: Record<string, any> = {
    visualConceptual: visualConceptualSchema,
    recipientIntelligence: recipientIntelligenceSchema,
    productPositioning: productPositioningSchema,
    giftGuideFit: giftGuideFitSchema,
    titleLaboratory: titleLaboratorySchema,
    competitiveDifferentiation: competitiveDifferentiationSchema,
    writingBrief: writingBriefSchema,
  };
  const baseReq = Object.keys(baseModules);

  const dimProps: Record<string, any> = {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    score: { type: Type.NUMBER },
    maxScore: { type: Type.NUMBER },
    explanation: { type: Type.STRING },
    supportingEvidence: { type: Type.STRING },
    missingEvidenceOrLimitations: { type: Type.STRING },
  };

  const currDimProps: Record<string, any> = {};
  for (const [propKey, propVal] of Object.entries(dimProps)) {
    currDimProps[propKey] = propVal;
    console.log(`Testing dimension with property: ${propKey}...`);
    try {
      await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: 'test',
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ...baseModules,
              scoring: {
                type: Type.OBJECT,
                properties: {
                  dimensions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { ...currDimProps },
                    },
                  },
                },
              },
            },
          },
        },
      });
      console.log(`✓ Dimension property ${propKey} passed!`);
    } catch (e: any) {
      console.log(`✗ Dimension property ${propKey} failed:`, e.message);
      break;
    }
  }
}

testDimensions();


