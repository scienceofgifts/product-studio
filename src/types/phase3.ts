/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ApprovedWritingExample {
  id: string;
  title: string;
  niche: string;
  guideName: string;
  approvedExcerpt: string;
  whyEffective: string;
  editorialPrinciples: string[];
  tags: string[];
  contentType?: string;
  createdAt: string;
}

export interface BriefQualityReport {
  blockingIssues: string[];
  warnings: string[];
  optionalImprovements: string[];
  clarifyingQuestions: string[];
  isSafeToProceed: boolean;
}

export interface ExtendedGiftGuideEditorial {
  purpose?: string;
  primaryBuyer?: string;
  toneAndStyle?: string;
  guideIntroduction?: string;
  representativeExcerpts?: string[];
  phrasingToAvoid?: string[];
  additionalInstructions?: string;
}
