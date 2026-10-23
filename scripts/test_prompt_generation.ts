/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkflowState } from '../src/types/workflow';
import { DEFAULT_EDITORIAL_RULES } from '../src/data/defaultEditorialRules';
import {
  synthesizeEditorialBrief,
  formatPromptForChatGPT,
  formatPromptForClaude
} from '../src/utils/briefGenerator';

// Test case data matching Requirement 9
const testState: WorkflowState = {
  currentStep: 6,
  highestStepReached: 6,
  images: [
    {
      id: 'img1',
      fileName: 'labyrinth_hoodie_mockup.png',
      mimeType: 'image/png',
      size: 102400,
      dataUrl: 'data:image/png;base64,fake',
      base64: 'fake'
    }
  ],
  details: {
    workingName: 'The Algorithmic Labyrinth Hoodie',
    productType: 'hoodie',
    giftGuideId: 'guide-youtubers',
    giftGuideName: 'YouTuber Gifts',
    primaryRecipient: 'YouTubers and content creators',
    secondaryRecipient: 'Video editors and stream managers',
    audienceInterest: 'YouTubers and content creators familiar with retention metrics and ad breaks',
    occasion: 'Channel milestone or holiday gift',
    productUrl: 'https://scienceofgifts.com/products/algorithmic-labyrinth-hoodie',
    currentTitle: 'The Algorithmic Labyrinth Hoodie',
    currentDescription: 'Black fleece hoodie featuring an intricate maze design inspired by channel analytics graphs.',
    productSpecs: 'Black hoodie, front kangaroo pocket, sizes S through 3XL, price $49.90–$53.90.',
    knownDesignReferences: 'Analytics retention graphs, video timeline scrubbing, YouTube algorithm maze',
    initialPositioningIdea: 'The Creator Inside Joke',
    specificQuestions: '',
    extractedFacts: {
      fabricComposition: { id: 'f1', label: 'Fabric Composition', value: '80% cotton, 20% polyester blend fleece', isVerified: true },
      price: { id: 'f2', label: 'Price', value: '$49.90–$53.90', isVerified: true },
      sizeRange: { id: 'f3', label: 'Size Range', value: 'S through 3XL', isVerified: true }
    } as any
  },
  analysisResult: {
    visualConceptual: {
      productTypeApparent: 'hoodie',
      mainSubjectAndSecondaryElements: 'Complex labyrinth maze printed on chest',
      visibleTextAndTypography: 'Discreet metrics axes',
      compositionAndHierarchy: 'Centered chest graphic',
      colorPaletteAndAesthetic: 'Deep black fabric with high-contrast white vector linework',
      symbolsAndMotifs: 'Maze nodes, retention curves, loop pathways',
      humorIronyMetaphors: 'Jokes about the endless struggle against algorithm shifts and watch time drop-offs',
      likelyToneAndAesthetic: 'Clean vector streetwear',
      distinctiveCharacteristics: ['Subtle creator-only joke', 'Clean streetwear print'],
      potentialAmbiguities: [],
      undeterminedInformation: [],
      findings: []
    },
    recipientIntelligence: {
      primaryRecipientProfile: 'YouTubers and video creators',
      knowledgeDepth: 'Deeply familiar with retention curves, click-through rates, and algorithmic changes',
      knowledgeSpectrum: {
        casualLevel: 'Knows YouTube analytics exists',
        enthusiastLevel: 'Checks YouTube Studio app regularly',
        specialistLevel: 'Analyzes retention graphs frame-by-frame'
      },
      reasonsToAppreciate: ['Recognizes the retention curve visual reference', 'Insiders-only creator humor'],
      appealTypes: [{ type: 'humorous', explanation: 'Satirizes creator metric obsession' }],
      relevantGiftingOccasions: ['Channel milestone', 'Creator meetup'],
      secondaryAudiences: ['Streamers', 'Video editors'],
      audienceMismatches: ['Casual video viewers who do not create content'],
      reasonsItMightNotAppeal: [],
      buyerMotivationVsRecipientPerspective: {
        buyerMotivation: 'Wants to show support for the creator\'s YouTube channel effort',
        recipientPreference: 'Wants apparel that feels like a genuine inside joke rather than generic merch',
        alignmentRisk: 'Avoid looking like generic YouTube logo merchandise'
      },
      shopperBuyingAdvice: ['Choose standard hoodie size for classic unisex fit'],
      hypothesisDisclaimer: ''
    },
    productPositioning: {
      distinctiveEssence: 'An inside joke about the endless pursuit of watch time, capturing the feeling of checking retention graphs',
      whyDeservesGiftConsideration: 'Validates the invisible hustle of content creation with smart streetwear aesthetic',
      bestServedRecipient: 'Active YouTubers and streamers',
      differenceFromGeneric: 'Subtle design reference only fellow creators recognize',
      strongestDesignDetails: ['Front kangaroo pocket', 'Black fleece fabric', 'Sizes S through 3XL'],
      weakOrUnsupportedClaimsToAvoid: ['Do not claim this guarantees higher CPMs or views'],
      primaryAppealDominance: 'humorous',
      positioningAngles: [
        {
          angleName: 'The Creator Inside Joke',
          intendedRecipient: 'YouTubers and content creators',
          centralAppeal: 'Captures the feeling of staring at retention curves and metric loops',
          supportingDesignEvidence: 'Black hoodie with front kangaroo pocket, sizes S through 3XL',
          giftBuyingMotivation: 'Acknowledge their hard work creating videos',
          strengths: ['Authentic creator resonance'],
          weaknessesOrLimitations: [],
          recommendation: 'preferred'
        }
      ],
      preferredAngleRationale: 'Resonates with creator identity'
    },
    writingBrief: {
      briefTitle: 'Editorial Brief for Algorithmic Labyrinth Hoodie',
      generatedDate: new Date().toISOString(),
      productIdentity: {
        workingTitle: 'The Algorithmic Labyrinth Hoodie',
        productType: 'hoodie',
        suppliedSpecifications: 'Black hoodie, front kangaroo pocket, sizes S through 3XL, price $49.90–$53.90'
      },
      guideContext: {
        guideName: 'YouTuber Gifts',
        guidePurpose: 'Curate thoughtful, high-context gifts for content creators'
      },
      recipientProfile: {
        primaryRecipient: 'YouTubers and content creators',
        knowledgeDepth: 'Enthusiast level; understands retention metrics and analytics',
        buyerMotivation: 'Celebrate creator effort'
      },
      recommendedTitles: {
        primary: 'The Algorithmic Labyrinth Hoodie',
        alternatives: ['The YouTube Studio Hoodie', 'The Retention Curve Hoodie']
      },
      editorialAngle: {
        recommendedAngle: 'The Creator Inside Joke',
        strategicRationale: 'Celebrates creator culture with insider humor',
        coreGoalOfEntry: 'Provide an engaging, natural gift recommendation',
        distinctiveInclusionReason: 'Subtle creator humor instead of generic logo merchandise'
      },
      productEditorialReasoning: {
        distinctiveConcept: 'Visual maze translating analytics graphs into wearable art',
        curatedDetailsToEmphasize: ['Black fleece hoodie', 'Front kangaroo pocket', 'Size range S-3XL'],
        whyDesignWorks: 'Jokes about creator metric obsession without looking tacky',
        buyerFacingInterpretation: 'A thoughtful nod to their video production hustle',
        verifiedFactsToInclude: ['Black hoodie', 'Front kangaroo pocket', 'Sizes S through 3XL', '$49.90–$53.90']
      },
      sampleEditorialEntry: '',
      toneAndStyleDirection: ['Grounded', 'Conversational', 'Insider appreciation'],
      claimsAndAssumptionsToAvoid: ['Do not claim custom fabric GSM unless verified'],
      confirmedSpecifications: ['Black hoodie', 'Front kangaroo pocket', 'Sizes S through 3XL', '$49.90–$53.90'],
      designDetailsToEmphasize: [],
      factsRequiringVerification: [],
      missingInformationDoNotInvent: [],
      qualityControlChecklist: []
    }
  } as any,
  editorialSelections: {
    selectedTitle: 'The Algorithmic Labyrinth Hoodie',
    selectedInterpretations: ['The design jokes about the pressure to keep viewers watching and videos performing. Its impossible maze captures the feeling of being stuck in a loop of making content and checking metrics.'],
    customInterpretation: '',
    selectedAngles: ['The Creator Inside Joke'],
    customAngle: '',
    selectedRecipients: ['YouTubers and content creators familiar with retention metrics and ad breaks'],
    customRecipient: ''
  },
  copyConfig: {
    writingStyle: 'perceptive' as any,
    customStyleDescription: 'Conversational insider appreciation',
    targetLength: 'standard',
    customWordCount: 210,
    outputFormat: 'prose',
    selectedSections: ['opening_description', 'design_meaning', 'who_it_is_for'],
    contentEmphasis: ['Creator inside joke', 'Verified physical details'],
    requiredInfoAndRestrictions: ['Must mention sizes S through 3XL and front kangaroo pocket', 'No em-dashes'],
    customRestrictions: '',
    seoKeywords: 'gifts for YouTubers, content creator hoodie, YouTube analytics gift',
    customInstructions: ''
  },
  editorialBriefMarkdown: '',
  generatedPrompt: '',
  selectedPromptModel: 'chatgpt',
  isBriefStale: false,
  isPromptStale: false
};

export function runPromptGenerationTest() {
  console.log('--- GENERATING EDITORIAL BRIEF ---');
  const brief = synthesizeEditorialBrief(testState, DEFAULT_EDITORIAL_RULES);
  console.log(brief);

  console.log('\n--- GENERATING CHATGPT WRITING PROMPT ---');
  const chatGptPrompt = formatPromptForChatGPT(brief, DEFAULT_EDITORIAL_RULES);
  console.log(chatGptPrompt);

  console.log('\n--- GENERATING CLAUDE WRITING PROMPT ---');
  const claudePrompt = formatPromptForClaude(brief, DEFAULT_EDITORIAL_RULES);
  console.log(claudePrompt);

  // Verification checks
  const checks = [
    {
      name: '1. Global Editorial Rules appear exactly once',
      pass: (chatGptPrompt.match(/SCIENCE OF GIFTS — GLOBAL EDITORIAL RULES/g) || []).length === 1
    },
    {
      name: '2. Product type is consistent (hoodie, NOT mug)',
      pass: chatGptPrompt.toLowerCase().includes('hoodie') && !chatGptPrompt.toLowerCase().includes('mug')
    },
    {
      name: '3. Creative angle provided clearly',
      pass: chatGptPrompt.includes('The Creator Inside Joke')
    },
    {
      name: '4. Does not force separate essay paragraph headers in output instructions',
      pass: chatGptPrompt.includes('flowing prose paragraphs') && chatGptPrompt.includes('natural flow')
    },
    {
      name: '5. Word count guidance avoids instructing padding',
      pass: chatGptPrompt.includes('without repeating ideas') || chatGptPrompt.includes('without adding filler')
    },
    {
      name: '6. Em-dash prohibition present',
      pass: chatGptPrompt.includes('em-dashes')
    },
    {
      name: '7. Verified physical facts included accurately',
      pass: chatGptPrompt.includes('Black hoodie') && chatGptPrompt.includes('kangaroo pocket') && chatGptPrompt.includes('S through 3XL')
    },
    {
      name: '8. Simple role description used',
      pass: chatGptPrompt.includes('You write product entries for Science of Gifts, a gift-guide website')
    }
  ];

  console.log('\n--- VERIFICATION CHECKS ---');
  let allPassed = true;
  checks.forEach((c) => {
    console.log(`${c.pass ? '✅ PASS' : '❌ FAIL'}: ${c.name}`);
    if (!c.pass) allPassed = false;
  });

  if (!allPassed) {
    throw new Error('Test failed: one or more prompt criteria did not pass.');
  } else {
    console.log('\n🎉 ALL PROMPT GENERATION VERIFICATION CHECKS PASSED!');
  }
}

runPromptGenerationTest();
