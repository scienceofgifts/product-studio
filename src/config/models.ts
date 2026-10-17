/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModelDefinition {
  id: string;
  name: string;
  category: 'flash-lite' | 'flash';
  description: string;
  isDefault?: boolean;
  isFallback?: boolean;
}

export const DEFAULT_MODEL_ID = 'gemini-3.5-flash-lite';
export const PREFERRED_FALLBACK_MODEL_ID = 'gemini-3.5-flash-lite';

/**
 * Centrally maintained registry of requested and supported Gemini Flash models.
 * Verified against Google GenAI API.
 */
export const SUPPORTED_MODELS: ModelDefinition[] = [
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    category: 'flash-lite',
    description: 'High efficiency, fast response, low-latency reasoning. Preferred default and fallback engine.',
    isDefault: true,
    isFallback: true,
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    category: 'flash',
    description: 'Balanced multimodal intelligence and structured reasoning across editorial niches.',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    category: 'flash',
    description: 'Enhanced multimodal reasoning and nuanced recipient context extraction.',
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    category: 'flash',
    description: 'Advanced reasoning model with deep conceptual comprehension across complex domains.',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    category: 'flash',
    description: 'Flagship Flash-class reasoning engine for high-context editorial workflows.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    category: 'flash-lite',
    description: 'Ultra-fast lightweight flash model with minimal latency for rapid drafting.',
  },
];

export const ALLOWED_MODEL_IDS: string[] = SUPPORTED_MODELS.map((m) => m.id);

/**
 * Validates if a model identifier is among the supported allowlist.
 */
export function isValidModelId(id?: string | null): boolean {
  if (!id) return false;
  return ALLOWED_MODEL_IDS.includes(id);
}

/**
 * Resolves a model identifier, migrating unapproved or retired models to the default model.
 */
export function resolveModelId(id?: string | null): string {
  if (isValidModelId(id)) {
    return id as string;
  }
  return DEFAULT_MODEL_ID;
}

/**
 * Retrieves full definition for a given model ID.
 */
export function getModelDefinition(id?: string | null): ModelDefinition {
  const resolved = resolveModelId(id);
  const found = SUPPORTED_MODELS.find((m) => m.id === resolved);
  return found || SUPPORTED_MODELS[0];
}
