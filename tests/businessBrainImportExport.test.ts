/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { validateBusinessBrainImport } from '../src/utils/businessBrainImportExport.js';
import { INITIAL_BUSINESS_BRAIN } from '../src/data/initialBusinessBrain.js';

console.log('Running Business Brain Import/Export Test Suite...\n');

async function runTests() {
  let passed = 0;

  // Test 1: Validation of valid flat Business Brain JSON
  {
    const exportedJson = JSON.stringify(INITIAL_BUSINESS_BRAIN, null, 2);
    const result = validateBusinessBrainImport(exportedJson, INITIAL_BUSINESS_BRAIN);

    assert.strictEqual(result.isValid, true);
    assert.ok(result.mergedBrain);
    assert.strictEqual(result.diffSummary?.fieldsModifiedCount, 0);
    console.log('✓ Test 1 passed: Validates existing Business Brain JSON export format.');
    passed++;
  }

  // Test 2: Validation of wrapped { businessBrain: ... } payload
  {
    const wrapped = JSON.stringify({ businessBrain: INITIAL_BUSINESS_BRAIN }, null, 2);
    const result = validateBusinessBrainImport(wrapped, INITIAL_BUSINESS_BRAIN);

    assert.strictEqual(result.isValid, true);
    assert.ok(result.mergedBrain);
    console.log('✓ Test 2 passed: Validates wrapped { businessBrain: ... } payload format.');
    passed++;
  }

  // Test 3: Safe merge of partial JSON without dropping omitted fields
  {
    const partialImport = JSON.stringify({
      businessPositioning: 'Updated Business Positioning statement for Science of Gifts.',
      prohibitedPatterns: 'Absolute ban on generic AI fluff: Prohibit "look no further".'
    });

    const result = validateBusinessBrainImport(partialImport, INITIAL_BUSINESS_BRAIN);
    assert.strictEqual(result.isValid, true);
    assert.ok(result.mergedBrain);
    assert.strictEqual(result.mergedBrain?.businessPositioning, 'Updated Business Positioning statement for Science of Gifts.');
    assert.strictEqual(result.mergedBrain?.prohibitedPatterns, 'Absolute ban on generic AI fluff: Prohibit "look no further".');
    // Ensure omitted fields preserved
    assert.strictEqual(result.mergedBrain?.editorialVoiceAndRules, INITIAL_BUSINESS_BRAIN.editorialVoiceAndRules);
    assert.strictEqual(result.diffSummary?.fieldsModifiedCount, 2);
    console.log('✓ Test 3 passed: Safely merges partial import without dropping omitted fields.');
    passed++;
  }

  // Test 4: Rejection of malformed JSON
  {
    const result = validateBusinessBrainImport('{ invalid json content ', INITIAL_BUSINESS_BRAIN);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.error?.includes('Invalid JSON syntax'));
    console.log('✓ Test 4 passed: Safely rejects malformed JSON.');
    passed++;
  }

  // Test 5: Rejection of incompatible JSON
  {
    const result = validateBusinessBrainImport(JSON.stringify({ unrelatedField: 'value' }), INITIAL_BUSINESS_BRAIN);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.error?.includes('Incompatible JSON format'));
    console.log('✓ Test 5 passed: Safely rejects incompatible JSON files.');
    passed++;
  }

  // Test 6: Round trip preserving multiline formatting and Unicode
  {
    const modifiedBrain = {
      ...INITIAL_BUSINESS_BRAIN,
      additionalInstructions: 'Line 1: Special directive with Unicode ⚡ and quotes "test".\nLine 2: Historical accuracy rules.'
    };

    const jsonStr = JSON.stringify(modifiedBrain, null, 2);
    const result = validateBusinessBrainImport(jsonStr, INITIAL_BUSINESS_BRAIN);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.mergedBrain?.additionalInstructions, 'Line 1: Special directive with Unicode ⚡ and quotes "test".\nLine 2: Historical accuracy rules.');
    console.log('✓ Test 6 passed: Preserves multiline strings, Unicode, and formatting through round trip.');
    passed++;
  }

  console.log(`\nAll ${passed} Business Brain import tests completed successfully!`);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
