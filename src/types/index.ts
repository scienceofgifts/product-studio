/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProductType =
  | 't-shirt'
  | 'hoodie'
  | 'sweatshirt'
  | 'mug'
  | 'drinkware'
  | 'notebook'
  | 'poster'
  | 'phone-case'
  | 'other';

export type AnalysisMode = 'full' | 'title' | 'recipient' | 'brief';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type AppealType =
  | 'functional'
  | 'aesthetic'
  | 'intellectual'
  | 'humorous'
  | 'sentimental'
  | 'identity-based';

export interface VisualFinding {
  observation: string;
  interpretation: string;
  confidence: ConfidenceLevel;
  verificationRequirement?: string;
}

export interface ModuleAVisualConceptual {
  productTypeApparent: string;
  mainSubjectAndSecondaryElements: string;
  visibleTextAndTypography: string;
  compositionAndHierarchy: string;
  colorPaletteAndAesthetic: string;
  symbolsAndMotifs: string;
  humorIronyMetaphors: string;
  likelyToneAndAesthetic: string;
  distinctiveCharacteristics: string[];
  potentialAmbiguities: string[];
  undeterminedInformation: string[];
  findings: VisualFinding[];
}

export interface KnowledgeDepthSpectrum {
  casualLevel: string;
  enthusiastLevel: string;
  specialistLevel: string;
}

export interface ModuleBRecipientIntelligence {
  primaryRecipientProfile: string;
  knowledgeDepth: string; // e.g. "Casual fan vs. Specialist historian vs. Aesthetic admirer"
  knowledgeSpectrum?: KnowledgeDepthSpectrum;
  reasonsToAppreciate: string[];
  appealTypes: {
    type: AppealType;
    explanation: string;
  }[];
  relevantGiftingOccasions: string[];
  secondaryAudiences: string[];
  audienceMismatches: string[];
  reasonsItMightNotAppeal: string[];
  buyerMotivationVsRecipientPerspective: {
    buyerMotivation: string;
    recipientPreference: string;
    alignmentRisk: string;
  };
  shopperBuyingAdvice?: string[];
  hypothesisDisclaimer: string;
}

export interface PositioningAngle {
  angleName: string;
  intendedRecipient: string;
  centralAppeal: string;
  supportingDesignEvidence: string;
  giftBuyingMotivation: string;
  strengths: string[];
  weaknessesOrLimitations: string[];
  recommendation: 'preferred' | 'viable' | 'weak';
}

export interface ModuleCProductPositioning {
  distinctiveEssence: string;
  whyDeservesGiftConsideration: string;
  bestServedRecipient: string;
  differenceFromGeneric: string;
  strongestDesignDetails: string[];
  weakOrUnsupportedClaimsToAvoid: string[];
  primaryAppealDominance: AppealType;
  positioningAngles: PositioningAngle[];
  preferredAngleRationale: string;
}

export interface ModuleDGiftGuideFit {
  fitsSelectedGuide: boolean;
  fitAssessment: string;
  uniqueRoleInGuide: string;
  varietyContribution: {
    aestheticRole: string;
    pricePointOrFormatRole: string;
    recipientAppealRole: string;
  };
  overlapRisks: string;
  entryJustificationNeeds: string;
  betterSuitedAlternativeGuides: string[];
  uniquenessDisclaimer: string; // Explicit notice if full guide inventory is not imported
}

export type TitleStrategyApproach =
  | 'direct_identification'
  | 'recipient_oriented'
  | 'distinctive_concept'
  | 'historical_cultural_reference'
  | 'subtle_humor'
  | 'editorial_framing'
  | 'design_specific'
  | 'intellectual_appeal'
  | 'witty_irreverent'
  | 'practical_gift_appeal'
  | 'concise_editorial'
  | 'specificity_led';

export interface TitleOption {
  proposedTitle: string;
  strategicApproach: TitleStrategyApproach;
  intendedAudience: string;
  strengths: string;
  weaknesses: string;
  searchIntentConsiderations: string;
  bestUseContext: 'editorial_guide_heading' | 'shop_product_page' | 'seo_title' | 'social_share_heading';
  conceptExplanation?: string;
  fitScore?: number;
}

export interface ExistingTitleEvaluation {
  currentTitleProvided: string;
  critique: string;
  strengths: string[];
  weaknesses: string[];
  verdict: 'needs_replacement' | 'viable_with_revisions' | 'strong_starting_point' | 'none_provided';
  recommendationNotes: string;
}

export interface ModuleETitleLaboratory {
  titleOptions: TitleOption[];
  recommendedTitle: string;
  recommendedTitleTradeOffs: string;
  recommendedRationale: string;
  runnerUpTitle?: string;
  runnerUpRationale?: string;
  intendedTitleContext: string;
  searchIntentDisclaimer: string;
  existingTitleEvaluation?: ExistingTitleEvaluation;
  guidePositioningContext?: string;
}

export interface ModuleFCompetitiveDifferentiation {
  nonInterchangeabilityFactors: string[];
  neededCompetitorResearch: string[];
  hypothesizedDifferentiators: string[];
  phase3ResearchRecommendations: string[];
  preliminaryAnalysisDisclaimer: string;
}

export interface ChatGPTWritingBrief {
  briefTitle: string;
  generatedDate: string;
  productIdentity: {
    workingTitle: string;
    productType: string;
    suppliedSpecifications: string;
  };
  guideContext: {
    guideName: string;
    guidePurpose: string;
  };
  recipientProfile: {
    primaryRecipient: string;
    knowledgeDepth: string;
    buyerMotivation: string;
  };
  recommendedTitles: {
    primary: string;
    alternatives: string[];
  };
  editorialAngle: {
    recommendedAngle: string;
    strategicRationale: string;
    coreGoalOfEntry: string;
    distinctiveInclusionReason: string;
  };
  productEditorialReasoning?: {
    distinctiveConcept: string;
    curatedDetailsToEmphasize: string[];
    whyDesignWorks: string;
    buyerFacingInterpretation: string;
    verifiedFactsToInclude: string[];
  };
  sampleEditorialEntry?: string;
  editorialQualityAudit?: {
    specificity: boolean;
    interpretation: boolean;
    angleQuality: boolean;
    factualIntegrity: boolean;
    relevance: boolean;
    redundancy: boolean;
    naturalness: boolean;
    buyerUsefulness: boolean;
    passed: boolean;
    notes: string;
  };
  designDetailsToEmphasize: {
    detail: string;
    relationshipToRecipient: string;
  }[];
  toneAndStyleDirection: string[];
  factsRequiringVerification: string[];
  claimsAndAssumptionsToAvoid: string[];
  confirmedSpecifications: string[];
  missingInformationDoNotInvent: string[];
  internalLinksSuggested?: {
    anchorText: string;
    destinationPurpose: string;
  }[];
  qualityControlChecklist: string[];
}

export interface ScoringDimension {
  id: string;
  name: string;
  score: number | null; // null represents "Insufficient data"
  maxScore: number;
  explanation: string;
  supportingEvidence: string;
  missingEvidenceOrLimitations: string;
}

export interface ScoringRubricResult {
  dimensions: ScoringDimension[];
  compositeExplanation: string;
  limitationsNotice: string;
}

export interface StructuredAnalysisResult {
  analysisId: string;
  analyzedAt: string;
  promptVersion: string;
  modelIdentifier: string; // legacy / primary identifier
  requestedModel?: string; // model explicitly requested by user
  actualModel?: string; // model that actually executed the analysis
  fallbackOccurred?: boolean; // whether a fallback was triggered
  fallbackReason?: string; // reason fallback was triggered
  businessBrainVersion: number;
  mode: AnalysisMode;
  visualConceptual?: ModuleAVisualConceptual;
  recipientIntelligence?: ModuleBRecipientIntelligence;
  productPositioning?: ModuleCProductPositioning;
  giftGuideFit?: ModuleDGiftGuideFit;
  titleLaboratory?: ModuleETitleLaboratory;
  competitiveDifferentiation?: ModuleFCompetitiveDifferentiation;
  writingBrief?: ChatGPTWritingBrief;
  scoring?: ScoringRubricResult;
  incompleteInformationNotices: string[];
}

export * from './productFacts';
import { StructuredProductFacts } from './productFacts';

export interface ProductDetailsInput {
  workingName: string;
  productType: ProductType;
  giftGuideId: string;
  giftGuideName: string;
  primaryRecipient: string;
  secondaryRecipient: string;
  audienceInterest: string;
  occasion: string;
  productUrl: string;
  currentTitle: string;
  currentDescription: string;
  productSpecs: string;
  knownDesignReferences: string;
  initialPositioningIdea: string;
  specificQuestions: string;
  extractedFacts?: StructuredProductFacts;
}

export interface SharedWorkingContext {
  giftGuideId: string;
  giftGuideName: string;
  primaryRecipient: string;
  secondaryRecipient: string;
  audienceInterest: string;
  occasion: string;
  initialPositioningIdea: string;
  productSpecs: string;
  knownDesignReferences: string;
  specificQuestions: string;
}

export interface ContextProfile {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  context: SharedWorkingContext;
  isDefault?: boolean;
}

export interface ProductRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  details: ProductDetailsInput;
  contextProfileId?: string;
  contextProfileName?: string;
  contextSnapshot?: SharedWorkingContext;
  imageBlob?: Blob;
  imageDataUrl?: string; // Cache for display
  imageFileName: string;
  imageMimeType: string;
  imageSize: number;
  imageDimensions?: { width: number; height: number };
  mode: AnalysisMode;
  status: 'draft' | 'analyzing' | 'completed' | 'failed';
  publicationStatus?: 'published' | 'in_review' | 'draft' | 'unassigned';
  catalogueSource?: 'manual_workspace' | 'imported_csv' | 'imported_json' | 'seed_catalogue';
  verifiedFields?: string[];
  analysisResult?: StructuredAnalysisResult;
  userNotes?: string;
  feedback?: {
    rating?: 'up' | 'down';
    notes?: string;
  };
}

export * from './similarity';

export interface BusinessBrainData {
  version: number;
  lastUpdated: string;
  businessPositioning: string;
  websiteShopStructure: string;
  targetAudiences: string;
  editorialVoiceAndRules: string;
  giftGuidePhilosophy: string;
  productPositioningPrinciples: string;
  seoPrinciples: string;
  knownCollections: string;
  historicalCulturalAccuracy: string;
  prohibitedPatterns: string;
  additionalInstructions: string;
}

export interface GiftGuide {
  id: string;
  name: string;
  description: string;
  targetPersona: string;
  niche: string;
  itemCount?: number;
  purpose?: string;
  primaryBuyer?: string;
  toneAndStyle?: string;
  guideIntroduction?: string;
  representativeExcerpts?: string[];
  phrasingToAvoid?: string[];
  additionalInstructions?: string;
}

export * from './phase3';
export * from './planner';
export * from './writingGuidelines';
export * from './fourthwall';
