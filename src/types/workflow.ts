/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductDetailsInput, StructuredAnalysisResult } from './index';

export type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface UploadedImageItem {
  id: string;
  blob?: Blob;
  base64: string;
  dataUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}

export interface EditorialSelections {
  selectedInterpretations: string[];
  customInterpretation?: string;
  selectedAngles: string[];
  customAngle?: string;
  selectedRecipients: string[];
  customRecipient?: string;
  selectedTitle?: string;
  customTitle?: string;
}

export type WritingStyleKey = 'scholarly' | 'witty' | 'restrained' | 'insider' | 'direct' | 'custom';
export type OutputFormatKey = 'prose' | 'structured';
export type TargetLengthKey = 'short' | 'standard' | 'long' | 'custom';

export interface CopySectionOption {
  id: string;
  label: string;
  description: string;
  isRecommended?: boolean;
}

export const AVAILABLE_COPY_SECTIONS: CopySectionOption[] = [
  {
    id: 'opening_description',
    label: 'Opening Description',
    description: 'Hook opening with the most distinctive, concrete observation about the item.',
    isRecommended: true
  },
  {
    id: 'design_and_meaning',
    label: 'Design & Meaning',
    description: 'Specific interpretation of why visual symbols, typography, or historic references work.',
    isRecommended: true
  },
  {
    id: 'who_it_is_for',
    label: 'Who It Is For',
    description: 'Direct recipient profiling, matching interest depth and enthusiast identity.',
    isRecommended: true
  },
  {
    id: 'why_great_gift',
    label: 'Why It Makes a Great Gift',
    description: 'Gift buyer perspective addressing why giving this demonstrates thought and taste.',
    isRecommended: true
  },
  {
    id: 'verified_product_details',
    label: 'Verified Product Details',
    description: 'Naturally woven physical facts (materials, dimensions, care, format).',
    isRecommended: true
  },
  {
    id: 'closing_line',
    label: 'Closing Line',
    description: 'Memorable, unforced conclusion avoiding generic promotional slogans.',
    isRecommended: false
  }
];

export interface CopyConfiguration {
  writingStyle: WritingStyleKey;
  customStyleDescription?: string;
  targetLength: TargetLengthKey;
  customWordCount?: number;
  contentEmphasis: string[];
  outputFormat: OutputFormatKey;
  selectedSections: string[];
  seoKeywords: string;
  requiredInfoAndRestrictions: string[];
  customRestrictions?: string;
  customInstructions?: string;
}

export interface WorkflowState {
  currentStep: WorkflowStep;
  highestStepReached: WorkflowStep;
  images: UploadedImageItem[];
  details: ProductDetailsInput;
  analysisResult: StructuredAnalysisResult | null;
  editorialSelections: EditorialSelections;
  copyConfig: CopyConfiguration;
  editorialBriefMarkdown?: string;
  generatedPrompt?: string;
  selectedPromptModel: 'chatgpt' | 'claude';
  isBriefStale?: boolean;
  isPromptStale?: boolean;
}

export const DEFAULT_COPY_CONFIG: CopyConfiguration = {
  writingStyle: 'scholarly',
  customStyleDescription: '',
  targetLength: 'standard', // 180-240 words
  customWordCount: 210,
  contentEmphasis: ['Design & Meaning', 'Gift Buyer Perspective', 'Recipient Persona Fit'],
  outputFormat: 'prose',
  selectedSections: [
    'opening_description',
    'design_and_meaning',
    'who_it_is_for',
    'why_great_gift',
    'verified_product_details'
  ],
  seoKeywords: '',
  requiredInfoAndRestrictions: [
    'Do not use em-dashes ("—")',
    'Do not use cliché gift slogans ("looking for the perfect gift", "must-have")',
    'Do not invent unverified historical or physical facts',
    'Address the gift-buyer while honoring recipient knowledge depth'
  ],
  customRestrictions: '',
  customInstructions: ''
};

export const DEFAULT_EDITORIAL_SELECTIONS: EditorialSelections = {
  selectedInterpretations: [],
  customInterpretation: '',
  selectedAngles: [],
  customAngle: '',
  selectedRecipients: [],
  customRecipient: '',
  selectedTitle: '',
  customTitle: ''
};
