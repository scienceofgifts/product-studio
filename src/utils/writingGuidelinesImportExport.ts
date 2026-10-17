/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WritingGuidelinesSettings, ApprovedWritingExample } from '../types/writingGuidelines';

export interface ExportedWritingConfiguration {
  formatIdentifier: 'science-of-gifts-writing-guidelines';
  schemaVersion: '1.0';
  exportTimestamp: string;
  appVersion?: string;
  guidelines: WritingGuidelinesSettings;
  examples: ApprovedWritingExample[];
}

export interface GuidelinesDiffSummary {
  universalRulesChanged: boolean;
  contentTypeProfilesModified: string[];
  examplesCount: number;
  newExamplesCount: number;
  modifiedExamplesCount: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  payload?: ExportedWritingConfiguration;
  diffSummary?: GuidelinesDiffSummary;
}

/**
 * Constructs a clean, versioned JSON export payload of the complete writing configuration.
 */
export function createWritingGuidelinesExport(
  guidelines: WritingGuidelinesSettings,
  examples: ApprovedWritingExample[]
): ExportedWritingConfiguration {
  return {
    formatIdentifier: 'science-of-gifts-writing-guidelines',
    schemaVersion: '1.0',
    exportTimestamp: new Date().toISOString(),
    appVersion: '1.2.0',
    guidelines: JSON.parse(JSON.stringify(guidelines)),
    examples: JSON.parse(JSON.stringify(examples))
  };
}

/**
 * Validates raw JSON string or object for import compatibility.
 */
export function validateWritingGuidelinesImport(
  rawJson: string | object,
  currentGuidelines?: WritingGuidelinesSettings,
  currentExamples?: ApprovedWritingExample[]
): ValidationResult {
  let data: any;

  if (typeof rawJson === 'string') {
    try {
      data = JSON.parse(rawJson);
    } catch (err: any) {
      return {
        isValid: false,
        error: `Invalid JSON syntax: ${err.message || 'Could not parse JSON file.'}`
      };
    }
  } else {
    data = rawJson;
  }

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      error: 'Invalid export payload: Expected a valid JSON object.'
    };
  }

  // 1. Check format identifier
  if (data.formatIdentifier !== 'science-of-gifts-writing-guidelines') {
    return {
      isValid: false,
      error: `Unrecognized format identifier '${data.formatIdentifier || 'undefined'}'. Expected 'science-of-gifts-writing-guidelines'.`
    };
  }

  // 2. Check schema version
  if (data.schemaVersion !== '1.0') {
    return {
      isValid: false,
      error: `Unsupported schema version '${data.schemaVersion || 'undefined'}'. Expected version '1.0'.`
    };
  }

  // 3. Validate guidelines object
  const g = data.guidelines;
  if (!g || typeof g !== 'object') {
    return {
      isValid: false,
      error: 'Missing or invalid "guidelines" section in import payload.'
    };
  }

  if (typeof g.universalGuidelines !== 'string' || typeof g.voiceAndTone !== 'string') {
    return {
      isValid: false,
      error: 'Invalid "guidelines" object: "universalGuidelines" and "voiceAndTone" must be text strings.'
    };
  }

  if (!g.contentTypeProfiles || typeof g.contentTypeProfiles !== 'object') {
    return {
      isValid: false,
      error: 'Invalid "guidelines" object: "contentTypeProfiles" section is missing or invalid.'
    };
  }

  // 4. Validate examples array
  const ex = data.examples;
  if (!Array.isArray(ex)) {
    return {
      isValid: false,
      error: 'Missing or invalid "examples" section in import payload: Expected an array of style examples.'
    };
  }

  for (let i = 0; i < ex.length; i++) {
    const item = ex[i];
    if (!item || typeof item !== 'object' || !item.id || !item.title || !item.approvedExcerpt) {
      return {
        isValid: false,
        error: `Invalid example item at index ${i}: Each example must contain 'id', 'title', and 'approvedExcerpt'.`
      };
    }
  }

  // Compute diff summary if current settings provided
  let diffSummary: GuidelinesDiffSummary | undefined;
  if (currentGuidelines) {
    const universalRulesChanged =
      g.universalGuidelines !== currentGuidelines.universalGuidelines ||
      g.voiceAndTone !== currentGuidelines.voiceAndTone ||
      g.thingsToAvoid !== currentGuidelines.thingsToAvoid ||
      g.factualAndEditorialGuardrails !== currentGuidelines.factualAndEditorialGuardrails;

    const contentTypeProfilesModified: string[] = [];
    if (g.contentTypeProfiles) {
      Object.keys(g.contentTypeProfiles).forEach((key) => {
        const importedProf = g.contentTypeProfiles[key];
        const currProf = (currentGuidelines.contentTypeProfiles as any)?.[key];
        if (!currProf || importedProf.instructions !== currProf.instructions || importedProf.formattingRules !== currProf.formattingRules) {
          contentTypeProfilesModified.push(key);
        }
      });
    }

    const currExampleIds = new Set((currentExamples || []).map((e) => e.id));
    let newExamplesCount = 0;
    let modifiedExamplesCount = 0;

    ex.forEach((importedEx: ApprovedWritingExample) => {
      if (!currExampleIds.has(importedEx.id)) {
        newExamplesCount++;
      } else {
        const curr = (currentExamples || []).find((e) => e.id === importedEx.id);
        if (curr && (curr.approvedExcerpt !== importedEx.approvedExcerpt || curr.title !== importedEx.title)) {
          modifiedExamplesCount++;
        }
      }
    });

    diffSummary = {
      universalRulesChanged,
      contentTypeProfilesModified,
      examplesCount: ex.length,
      newExamplesCount,
      modifiedExamplesCount
    };
  }

  return {
    isValid: true,
    payload: data as ExportedWritingConfiguration,
    diffSummary
  };
}
