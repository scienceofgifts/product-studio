/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductRecord, ProductType } from './index';

export type PublicationStatus = 'published' | 'in_review' | 'draft' | 'unassigned';

export type SimilarityCategory =
  | 'near_duplicate'
  | 'strongly_overlapping'
  | 'distinct_positioning'
  | 'complementary'
  | 'unrelated';

export type DimensionLevel =
  | 'identical'
  | 'high'
  | 'moderate'
  | 'low'
  | 'none'
  | 'insufficient_data';

export type ComparisonDimension =
  | 'subject'
  | 'conceptual'
  | 'visual'
  | 'recipient'
  | 'editorial'
  | 'format';

export interface DimensionAssessment {
  dimension: ComparisonDimension;
  dimensionName: string;
  level: DimensionLevel;
  score: number | null; // 0 to 10 scale, or null for insufficient data
  summary: string;
  specificEvidence: string[];
  meaningfulDifferences: string[];
  missingInformationNotices?: string[];
}

export type FeedbackRating =
  | 'accurate'
  | 'partially_accurate'
  | 'incorrect'
  | 'insufficient_information';

export interface ComparisonFeedback {
  id: string;
  comparisonKey: string; // productAId_productBId (sorted alphabetically)
  productAId: string;
  productBId: string;
  rating: FeedbackRating;
  userNotes: string;
  adjustedCategory?: SimilarityCategory;
  submittedAt: string;
  updatedAt: string;
}

export interface ProductComparisonResult {
  id: string;
  comparisonKey: string;
  productAId: string;
  productAName: string;
  productAFormat: ProductType;
  productAGuide: string;
  productBId: string;
  productBName: string;
  productBFormat: ProductType;
  productBGuide: string;
  overallCategory: SimilarityCategory;
  categoryLabel: string;
  heuristicScore: number | null; // Heuristic estimate (0-100), transparently documented
  qualitativeAssessment: string;
  dimensions: {
    subject: DimensionAssessment;
    conceptual: DimensionAssessment;
    visual: DimensionAssessment;
    recipient: DimensionAssessment;
    editorial: DimensionAssessment;
    format: DimensionAssessment;
  };
  keySimilarities: string[];
  keyDifferences: string[];
  positioningImplications: string;
  recommendedAction: string;
  confidence: 'high' | 'medium' | 'low';
  missingInformationWarnings: string[];
  calculatedAt: string;
  engine: 'deterministic_rules_v1' | 'gemini_multidimensional_v1';
  userFeedback?: ComparisonFeedback;
}

export interface ConceptCluster {
  id: string;
  niche: string;
  centralConcept: string;
  productIds: string[];
  productNames: string[];
  riskLevel: 'high_redundancy' | 'moderate_overlap' | 'healthy_variety';
  summary: string;
  recommendation: string;
}

export interface RedundantPairAlert {
  productA: ProductRecord;
  productB: ProductRecord;
  comparison: ProductComparisonResult;
  urgency: 'high' | 'moderate' | 'low';
  reason: string;
}

export interface GuideCoverageGap {
  id: string;
  gapTitle: string;
  gapDescription: string;
  evidenceFromCatalogue: string;
  missingAudienceOrFormat: string;
  strategicOpportunity: string;
  suggestedAction: string;
}

export interface GuideCoverageAnalysis {
  guideId: string;
  guideName: string;
  totalAssigned: number;
  publishedCount: number;
  inReviewCount: number;
  draftCount: number;
  unassignedCount: number;
  recipientBreadth: string;
  formatDiversity: { format: string; count: number; percentage: number }[];
  editorialAnglesRepresented: string[];
  repeatedConcepts: string[];
  interchangeableEntriesRisk: string[];
  distinctiveAnchorProducts: { id: string; name: string; reason: string }[];
  identifiedCoverageGaps: GuideCoverageGap[];
  dataCompletenessAssessment: string;
}

export interface DevelopmentOpportunity {
  id: string;
  niche: string;
  opportunityTitle: string;
  opportunityDescription: string;
  evidenceFromCatalogue: string;
  intendedRecipient: string;
  whyWorthwhile: string;
  existingProductsPartiallyAddressing: {
    id: string;
    name: string;
    overlapNote: string;
  }[];
  whatMakesNewProductDifferent: string;
  missingInformation: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  recommendedNextAction: string;
}
