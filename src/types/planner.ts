/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductType } from './index';

export interface GuideBrief {
  workingTitle: string;
  topicOrNiche: string;
  targetBuyer: string;
  intendedRecipients: string[];
  occasion: string;
  primaryReaderProblem: string;
  guidePurpose: string;
  editorialAngle: string;
  preferredTone: string;
  subjectDepth: string;
  lengthGuidance: string;
  editorialNotes: string;
  constraints: string;
  contextProfileId?: string;
}

export interface GuideLineupItem {
  id: string; // unique item id in lineup
  productId: string; // catalogue product id or 'guide-only-<timestamp>'
  customTitle?: string;
  customFormat?: ProductType;
  customRecipient?: string;
  editorialRole: string;
  differentiationNotes: string;
  sortOrder: number;
  isGuideOnly?: boolean;
  customDescription?: string;
}

export interface RedundancyFinding {
  issue: string;
  productIds: string[];
  evidence: string;
  recommendation: string;
}

export interface RecipientCoverageItem {
  subgroup: string;
  covered: boolean;
  notes: string;
}

export interface AngleDiversityItem {
  angle: string;
  productIds: string[];
}

export interface FormatDiversityItem {
  format: string;
  count: number;
}

export interface UncertaintyItem {
  productId: string;
  productName: string;
  issue: string;
}

export interface ActionableRecommendation {
  severity: 'blocker' | 'warning' | 'suggestion';
  issue: string;
  productIds?: string[];
  evidence: string;
  readerImportance: string;
  suggestedAction: string;
}

export interface GuideAnalysisResult {
  timestamp: string;
  redundancyFindings: RedundancyFinding[];
  recipientCoverage: RecipientCoverageItem[];
  angleDiversity: AngleDiversityItem[];
  formatDiversity: FormatDiversityItem[];
  uncertainties: UncertaintyItem[];
  actionableRecommendations: ActionableRecommendation[];
}

export interface GuideOutlineSection {
  id: string;
  title: string;
  type: 'introduction' | 'product_entries' | 'buying_advice' | 'faq' | 'closing';
  content: string;
  isApproved: boolean;
  needsRevision: boolean;
  lastGeneratedVersion?: string;
}

export interface GuideOutline {
  version: number;
  lastModified: string;
  isApproved: boolean;
  sections: GuideOutlineSection[];
}

export interface InternalLinkItem {
  id: string;
  title: string;
  anchorText: string;
  relevance: string;
}

export interface GeneratedPromptRecord {
  version: number;
  timestamp: string;
  promptText: string;
}

export interface GuidePlanRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  guideId?: string; // link to saved GiftGuide if desired
  title: string;
  brief: GuideBrief;
  lineup: GuideLineupItem[];
  analysisResult?: GuideAnalysisResult;
  outline?: GuideOutline;
  generatedPrompt?: GeneratedPromptRecord;
  internalLinks?: InternalLinkItem[];
}
