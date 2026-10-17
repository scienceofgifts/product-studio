/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WritingGuidelinesSettings, ContentTypeKey, ApprovedWritingExample } from '../types/writingGuidelines';

export interface PromptCompositionOptions {
  guidelines: WritingGuidelinesSettings;
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
 * Centralized Prompt Composition Utility combining guideline layers consistently.
 */
export function composePromptWithGuidelines(options: PromptCompositionOptions): string {
  const {
    guidelines,
    contentType,
    guideOverrides,
    taskInstructions,
    productOrGuideContext,
    examples = [],
    maxExamplesToInclude = 2
  } = options;

  const parts: string[] = [];

  // Layer 1: Universal Writing Guidelines
  if (guidelines.universalGuidelines || guidelines.voiceAndTone || guidelines.thingsToAvoid) {
    parts.push(`=== UNIVERSAL WRITING GUIDELINES ===\n${guidelines.universalGuidelines}\n\nVoice & Tone: ${guidelines.voiceAndTone}\n\nThings to Avoid:\n${guidelines.thingsToAvoid}\n\nGuardrails:\n${guidelines.factualAndEditorialGuardrails}`);
  }

  // Layer 2: Content-Type Profile
  if (contentType && guidelines.contentTypeProfiles && guidelines.contentTypeProfiles[contentType]) {
    const profile = guidelines.contentTypeProfiles[contentType];
    if (profile.instructions || profile.formattingRules) {
      parts.push(`=== CONTENT-TYPE SPECIFIC RULES (${contentType.toUpperCase().replace('_', ' ')}) ===\nInstructions: ${profile.instructions}\nFormatting Rules: ${profile.formattingRules}`);
    }
  }

  // Layer 3: Guide-Specific Overrides
  if (guideOverrides && guideOverrides.trim()) {
    parts.push(`=== GUIDE-SPECIFIC EDITORIAL OVERRIDES ===\n${guideOverrides.trim()}`);
  }

  // Layer 4: Relevant Approved Examples (Calibration)
  if (examples.length > 0) {
    const relevantExamples = examples
      .filter((ex) => !contentType || ex.contentType === contentType || !ex.contentType)
      .slice(0, maxExamplesToInclude);

    if (relevantExamples.length > 0) {
      const examplesText = relevantExamples
        .map(
          (ex) => `Example Title: "${ex.title}"\nApproved Excerpt:\n"${ex.approvedExcerpt}"\nWhy Effective: ${ex.whyEffective}`
        )
        .join('\n\n');
      parts.push(`=== APPROVED EDITORIAL CALIBRATION EXAMPLES ===\nUse these examples to calibrate voice, specificity, and pacing without copying their wording:\n\n${examplesText}`);
    }
  }

  // Layer 5: Current Task Instructions & Context
  parts.push(`=== TASK INSTRUCTIONS & CONTEXT ===\n${taskInstructions}\n\nContext:\n${productOrGuideContext}`);

  return parts.join('\n\n---\n\n');
}

/**
 * Generate a detailed prompt breakdown for previewing guideline layers in UI.
 */
export function getPromptBreakdown(options: PromptCompositionOptions): PromptBreakdown {
  const {
    guidelines,
    contentType,
    guideOverrides,
    taskInstructions,
    productOrGuideContext,
    examples = [],
    maxExamplesToInclude = 2
  } = options;

  const universalLayer = `=== UNIVERSAL WRITING GUIDELINES ===\n${guidelines.universalGuidelines}\n\nVoice & Tone: ${guidelines.voiceAndTone}\n\nThings to Avoid:\n${guidelines.thingsToAvoid}\n\nGuardrails:\n${guidelines.factualAndEditorialGuardrails}`;

  let contentTypeLayer = 'None specified (inherits universal guidelines)';
  if (contentType && guidelines.contentTypeProfiles && guidelines.contentTypeProfiles[contentType]) {
    const profile = guidelines.contentTypeProfiles[contentType];
    contentTypeLayer = `=== CONTENT-TYPE SPECIFIC RULES (${contentType.toUpperCase().replace('_', ' ')}) ===\nInstructions: ${profile.instructions}\nFormatting Rules: ${profile.formattingRules}`;
  }

  const guideOverridesLayer = guideOverrides && guideOverrides.trim()
    ? `=== GUIDE-SPECIFIC EDITORIAL OVERRIDES ===\n${guideOverrides.trim()}`
    : 'None specified for this guide';

  let examplesLayer = 'No calibration examples attached';
  const relevantExamples = examples
    .filter((ex) => !contentType || ex.contentType === contentType || !ex.contentType)
    .slice(0, maxExamplesToInclude);

  if (relevantExamples.length > 0) {
    examplesLayer = relevantExamples
      .map((ex) => `[Example: "${ex.title}"] Why Effective: ${ex.whyEffective}`)
      .join('\n');
  }

  const taskLayer = `=== TASK INSTRUCTIONS & CONTEXT ===\n${taskInstructions}\n\nContext:\n${productOrGuideContext}`;

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
