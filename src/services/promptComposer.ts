/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_EDITORIAL_RULES } from '../data/defaultEditorialRules';
import { WritingGuidelinesSettings, ContentTypeKey, ApprovedWritingExample } from '../types/writingGuidelines';

export interface PromptCompositionOptions {
  editorialRules?: string;
  guidelines?: WritingGuidelinesSettings;
  contentType?: ContentTypeKey;
  guideOverrides?: string;
  taskInstructions: string;
  productOrGuideContext: string;
  examples?: ApprovedWritingExample[];
  maxExamplesToInclude?: number;
}

export interface PromptBreakdown {
  universalLayer: string;
  contentTypeLayer: string;
  guideOverridesLayer: string;
  examplesLayer: string;
  taskLayer: string;
  fullComposedPrompt: string;
}

/**
 * Centralized Prompt Composition Utility using unified Editorial Rules with strict precedence.
 */
export function composePromptWithGuidelines(options: PromptCompositionOptions): string {
  const {
    editorialRules,
    guidelines,
    contentType,
    guideOverrides,
    taskInstructions,
    productOrGuideContext,
  } = options;

  const parts: string[] = [];

  // Layer 1: Canonical Global Editorial Rules (Directly applied)
  const activeRules = editorialRules?.trim() || (guidelines?.universalGuidelines ? `${guidelines.universalGuidelines}\n\nVoice & Tone: ${guidelines.voiceAndTone}\n\nAvoid: ${guidelines.thingsToAvoid}` : DEFAULT_EDITORIAL_RULES);
  parts.push(`=== GLOBAL EDITORIAL RULES ===\n${activeRules}`);

  // Layer 2: Guide-Specific Overrides (if any)
  if (guideOverrides && guideOverrides.trim()) {
    parts.push(`=== GUIDE-SPECIFIC EDITORIAL CHOICES ===\n${guideOverrides.trim()}`);
  }

  // Layer 3: Current Task Instructions & Context
  parts.push(`=== TASK INSTRUCTIONS & CONTEXT ===\n${taskInstructions}\n\nContext:\n${productOrGuideContext}`);

  return parts.join('\n\n---\n\n');
}

/**
 * Generate a detailed prompt breakdown for previewing rules in UI.
 */
export function getPromptBreakdown(options: PromptCompositionOptions): PromptBreakdown {
  const {
    editorialRules,
    guidelines,
    contentType,
    guideOverrides,
    taskInstructions,
    productOrGuideContext,
  } = options;

  const universalLayer = editorialRules?.trim() || (guidelines?.universalGuidelines ? `${guidelines.universalGuidelines}` : DEFAULT_EDITORIAL_RULES);
  const contentTypeLayer = contentType ? `Content Type: ${contentType}` : 'Standard Editorial Entry';
  const guideOverridesLayer = guideOverrides?.trim() || 'None specified';
  const examplesLayer = 'Unified into Global Editorial Rules';
  const taskLayer = `${taskInstructions}\n\nContext:\n${productOrGuideContext}`;

  const fullComposedPrompt = composePromptWithGuidelines(options);

  return {
    universalLayer,
    contentTypeLayer,
    guideOverridesLayer,
    examplesLayer,
    taskLayer,
    fullComposedPrompt
  };
}
