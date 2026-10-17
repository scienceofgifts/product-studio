/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductType } from './index';

export type FourthwallCategory =
  | 'Apparel'
  | 'Drinkware'
  | 'Home & Living'
  | 'Accessories'
  | 'Stationery'
  | 'Tech'
  | 'Glassware';

export type RecommendationStatus = 'prioritize' | 'test' | 'consider_later' | 'skip';

export interface FourthwallProductSpec {
  id: string;
  name: string;
  productType: ProductType | string;
  category: FourthwallCategory;
  printingMethods: string[];
  printableArea: string;
  dimensions: string;
  aspectRatio: string;
  productionConstraints: string[];
  availableColors: string[];
  baseCost: number;
  suggestedRetailPrice: number;
  demandIndicator: 'Best Seller' | 'Popular' | 'Emerging' | 'Steady' | 'Niche';
  catalogEngagementScore: number; // 0-100
  averageRating?: number;
  reviewCount?: number;
  productUrl: string;
  lastUpdated: string;
  isAvailable: boolean;
  discontinuedReason?: string;
}

export interface ProductFitEvaluation {
  productId: string;
  fourthwallProduct: FourthwallProductSpec;
  recommendationStatus: RecommendationStatus;
  compatibilityScore: number; // 0-100
  giftSuitabilityScore: number; // 0-100
  demandScore: number; // 0-100
  commercialViabilityScore: number; // 0-100
  overallScore: number;
  whyItSuits: string;
  giftAppealAndBuyer: string;
  demandEvidence: string;
  verifiedConstraints: string[];
  requiredModifications: string[];
  optionalRefinements: string[];
  preferredVariant: string;
  confidence: 'high' | 'medium' | 'low';
  unknowns: string[];
}

export interface CatalogueIntelligenceReport {
  lastRefreshed: string;
  totalProductsVerified: number;
  sourceUrl: string;
  evaluations: ProductFitEvaluation[];
}
