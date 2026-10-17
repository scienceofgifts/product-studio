/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusinessBrainData } from '../types';

export interface BusinessBrainDiffSummary {
  fieldsModifiedCount: number;
  modifiedFieldLabels: string[];
  isVersionUpdated: boolean;
}

export interface BusinessBrainValidationResult {
  isValid: boolean;
  error?: string;
  mergedBrain?: BusinessBrainData;
  diffSummary?: BusinessBrainDiffSummary;
}

export const BUSINESS_BRAIN_FIELD_LABELS: Record<keyof Omit<BusinessBrainData, 'version' | 'lastUpdated'>, string> = {
  businessPositioning: '1. Business Positioning & Philosophy',
  websiteShopStructure: '2. Website & Shop Structure',
  targetAudiences: '3. Target Audiences & Sub-Niche Distinctions',
  editorialVoiceAndRules: '4. Editorial Voice & Writing Rules',
  giftGuidePhilosophy: '5. Gift-Guide Philosophy',
  productPositioningPrinciples: '6. Product-Positioning Principles',
  seoPrinciples: '7. SEO Principles & Discovery',
  knownCollections: '8. Known Product Collections',
  historicalCulturalAccuracy: '9. Historical & Cultural Accuracy Requirements',
  prohibitedPatterns: '10. Prohibited Writing Patterns & Clichés',
  additionalInstructions: '11. Additional Instructions for Analysis Engine'
};

/**
 * Validates and safely merges imported JSON into current BusinessBrainData structure.
 */
export function validateBusinessBrainImport(
  rawJson: string | object,
  currentBrain: BusinessBrainData
): BusinessBrainValidationResult {
  let importedObj: any;

  if (typeof rawJson === 'string') {
    try {
      importedObj = JSON.parse(rawJson);
    } catch (err: any) {
      return {
        isValid: false,
        error: `Invalid JSON syntax: ${err.message || 'Could not parse JSON file.'}`
      };
    }
  } else {
    importedObj = rawJson;
  }

  if (!importedObj || typeof importedObj !== 'object') {
    return {
      isValid: false,
      error: 'Invalid import payload: Expected a valid JSON object.'
    };
  }

  // Handle wrapper if object is wrapped inside { businessBrain: ... }
  const payload = importedObj.businessBrain && typeof importedObj.businessBrain === 'object'
    ? importedObj.businessBrain
    : importedObj;

  const validKeys: Array<keyof Omit<BusinessBrainData, 'version' | 'lastUpdated'>> = [
    'businessPositioning',
    'websiteShopStructure',
    'targetAudiences',
    'editorialVoiceAndRules',
    'giftGuidePhilosophy',
    'productPositioningPrinciples',
    'seoPrinciples',
    'knownCollections',
    'historicalCulturalAccuracy',
    'prohibitedPatterns',
    'additionalInstructions'
  ];

  // Check if at least one recognizable field exists in payload
  const hasRecognizedField = validKeys.some((k) => payload[k] !== undefined && typeof payload[k] === 'string');

  if (!hasRecognizedField) {
    return {
      isValid: false,
      error: 'Incompatible JSON format: The uploaded file does not contain recognized Business Brain fields.'
    };
  }

  // Merge payload safely over current brain to prevent erasing omitted fields
  const mergedBrain: BusinessBrainData = {
    ...currentBrain,
    version: typeof payload.version === 'number' ? Math.max(currentBrain.version + 1, payload.version) : currentBrain.version + 1,
    lastUpdated: new Date().toISOString()
  };

  const modifiedFieldLabels: string[] = [];

  validKeys.forEach((key) => {
    if (payload[key] !== undefined && typeof payload[key] === 'string') {
      const newVal = payload[key].trim();
      const currVal = (currentBrain[key] || '').trim();
      if (newVal !== currVal) {
        mergedBrain[key] = payload[key]; // Preserve exact formatting/multiline/Unicode
        modifiedFieldLabels.push(BUSINESS_BRAIN_FIELD_LABELS[key]);
      }
    }
  });

  const diffSummary: BusinessBrainDiffSummary = {
    fieldsModifiedCount: modifiedFieldLabels.length,
    modifiedFieldLabels,
    isVersionUpdated: mergedBrain.version !== currentBrain.version
  };

  return {
    isValid: true,
    mergedBrain,
    diffSummary
  };
}
