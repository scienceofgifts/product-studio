/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {
  createWritingGuidelinesExport,
  validateWritingGuidelinesImport
} from '../src/utils/writingGuidelinesImportExport.js';
import { INITIAL_WRITING_GUIDELINES, INITIAL_WRITING_EXAMPLES_LIST } from '../src/data/initialWritingGuidelines.js';

console.log('Running Writing Guidelines Import/Export Test Suite...\n');

async function runTests() {
  let passed = 0;

  // Test 1: Export generation
  {
    const exported = createWritingGuidelinesExport(INITIAL_WRITING_GUIDELINES, INITIAL_WRITING_EXAMPLES_LIST);
    assert.strictEqual(exported.formatIdentifier, 'science-of-gifts-writing-guidelines');
    assert.strictEqual(exported.schemaVersion, '1.0');
    assert.ok(exported.exportTimestamp);
    assert.ok(exported.guidelines.universalGuidelines);
    assert.ok(exported.examples.length > 0);
    console.log('✓ Test 1 passed: Export payload created with correct schema & structure.');
    passed++;
  }

  // Test 2: Validation of valid exported JSON
  {
    const exported = createWritingGuidelinesExport(INITIAL_WRITING_GUIDELINES, INITIAL_WRITING_EXAMPLES_LIST);
    const jsonStr = JSON.stringify(exported, null, 2);
    const result = validateWritingGuidelinesImport(jsonStr, INITIAL_WRITING_GUIDELINES, INITIAL_WRITING_EXAMPLES_LIST);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.payload?.formatIdentifier, 'science-of-gifts-writing-guidelines');
    assert.ok(result.diffSummary);
    assert.strictEqual(result.diffSummary?.universalRulesChanged, false);
    console.log('✓ Test 2 passed: Validation succeeds for valid exported JSON payload.');
    passed++;
  }

  // Test 3: Rejection of malformed JSON
  {
    const result = validateWritingGuidelinesImport('{ invalid json content: ');
    assert.strictEqual(result.isValid, false);
    assert.ok(result.error?.includes('Invalid JSON syntax'));
    console.log('✓ Test 3 passed: Safely rejects malformed JSON.');
    passed++;
  }

  // Test 4: Rejection of invalid formatIdentifier
  {
    const invalidFormatPayload = {
      formatIdentifier: 'wrong-format',
      schemaVersion: '1.0',
      guidelines: INITIAL_WRITING_GUIDELINES,
      examples: []
    };
    const result = validateWritingGuidelinesImport(invalidFormatPayload);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.error?.includes('Unrecognized format identifier'));
    console.log('✓ Test 4 passed: Safely rejects invalid formatIdentifier.');
    passed++;
  }

  // Test 5: Rejection of unsupported schema version
  {
    const invalidVersionPayload = {
      formatIdentifier: 'science-of-gifts-writing-guidelines',
      schemaVersion: '99.0',
      guidelines: INITIAL_WRITING_GUIDELINES,
      examples: []
    };
    const result = validateWritingGuidelinesImport(invalidVersionPayload);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.error?.includes('Unsupported schema version'));
    console.log('✓ Test 5 passed: Safely rejects unsupported schema version.');
    passed++;
  }

  // Test 6: Round trip with modified universal rules
  {
    const exported = createWritingGuidelinesExport(INITIAL_WRITING_GUIDELINES, INITIAL_WRITING_EXAMPLES_LIST);
    exported.guidelines.universalGuidelines += '\n\nAdditional ChatGPT Editorial Mandate: Always cite primary source manuscripts.';
    const jsonStr = JSON.stringify(exported, null, 2);

    const result = validateWritingGuidelinesImport(jsonStr, INITIAL_WRITING_GUIDELINES, INITIAL_WRITING_EXAMPLES_LIST);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.diffSummary?.universalRulesChanged, true);
    assert.ok(result.payload?.guidelines.universalGuidelines.includes('Always cite primary source manuscripts'));
    console.log('✓ Test 6 passed: Round-trip modification of universal guidelines detected in diff summary.');
    passed++;
  }

  console.log(`\nAll ${passed} import/export tests completed successfully!`);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
