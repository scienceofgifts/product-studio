/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { INITIAL_WRITING_GUIDELINES, INITIAL_WRITING_EXAMPLES_LIST } from '../src/data/initialWritingGuidelines.js';
import { getPromptBreakdown, composePromptWithGuidelines } from '../src/services/promptComposer.js';
import { createWritingGuidelinesExport, validateWritingGuidelinesImport } from '../src/utils/writingGuidelinesImportExport.js';
import { ApprovedWritingExample } from '../src/types/writingGuidelines.js';

console.log('Running Writing Guidelines Example Deletion Test Suite...\n');

async function runTests() {
  let passed = 0;

  // Test 1: Deleting an example updates prompt breakdown immediately and removes example content
  {
    const initialExamples = [...INITIAL_WRITING_EXAMPLES_LIST];
    assert.ok(initialExamples.length >= 2, 'Should have initial default examples');

    const targetToDelete = initialExamples[0];
    const remainingExamples = initialExamples.filter((ex) => ex.id !== targetToDelete.id);

    // Initial breakdown with all examples
    const initialBreakdown = getPromptBreakdown({
      guidelines: INITIAL_WRITING_GUIDELINES,
      contentType: 'product_entry',
      taskInstructions: 'Draft product entry for test item.',
      productOrGuideContext: 'Context sample',
      examples: initialExamples
    });

    assert.ok(initialBreakdown.fullComposedPrompt.includes(targetToDelete.title));

    // Updated breakdown with target example removed
    const updatedBreakdown = getPromptBreakdown({
      guidelines: INITIAL_WRITING_GUIDELINES,
      contentType: 'product_entry',
      taskInstructions: 'Draft product entry for test item.',
      productOrGuideContext: 'Context sample',
      examples: remainingExamples
    });

    assert.strictEqual(
      updatedBreakdown.fullComposedPrompt.includes(targetToDelete.title),
      false,
      'Deleted example title must NOT be present in composed prompt'
    );
    assert.strictEqual(
      updatedBreakdown.fullComposedPrompt.includes(targetToDelete.approvedExcerpt),
      false,
      'Deleted example excerpt must NOT be present in composed prompt'
    );

    console.log('✓ Test 1 passed: Example deletion immediately removes content from composed prompt breakdown.');
    passed++;
  }

  // Test 2: Deleting all default examples results in "No calibration examples attached" and clean export
  {
    const emptyExamples: ApprovedWritingExample[] = [];

    const breakdown = getPromptBreakdown({
      guidelines: INITIAL_WRITING_GUIDELINES,
      contentType: 'product_entry',
      taskInstructions: 'Draft product entry',
      productOrGuideContext: 'Context sample',
      examples: emptyExamples
    });

    assert.strictEqual(breakdown.examplesLayer, 'No calibration examples attached');
    assert.strictEqual(
      breakdown.fullComposedPrompt.includes('APPROVED EDITORIAL CALIBRATION EXAMPLES'),
      false,
      'Composed prompt should omit calibration section when examples array is empty'
    );

    // Export empty examples configuration
    const exported = createWritingGuidelinesExport(INITIAL_WRITING_GUIDELINES, emptyExamples);
    assert.strictEqual(exported.examples.length, 0);

    // Validate import of empty examples configuration
    const validation = validateWritingGuidelinesImport(exported, INITIAL_WRITING_GUIDELINES, INITIAL_WRITING_EXAMPLES_LIST);
    assert.strictEqual(validation.isValid, true);
    assert.strictEqual(validation.payload?.examples.length, 0);

    console.log('✓ Test 2 passed: Deleting all default examples leaves clean zero-example state without auto-reinsertion.');
    passed++;
  }

  // Test 3: Adding a new example and deleting a default example preserves remaining items
  {
    const customExample: ApprovedWritingExample = {
      id: 'custom-ex-101',
      title: 'Custom Curated Bronze Astrolabe Entry',
      niche: 'Renaissance Astronomy',
      guideName: 'Science of Gifts Curated Guide',
      approvedExcerpt: 'Cast in heavy brass with hand-chased concentric calendars, this astrolabe serves as a functional navigational instrument.',
      whyEffective: 'Demonstrates precise material descriptions and physical mechanisms without marketing jargon.',
      editorialPrinciples: ['Material precision', 'Historical authenticity'],
      tags: ['Calibration'],
      contentType: 'product_entry',
      createdAt: new Date().toISOString()
    };

    // Remove first default example and append custom example
    const modifiedExamples = [
      ...INITIAL_WRITING_EXAMPLES_LIST.slice(1),
      customExample
    ];

    const breakdown = getPromptBreakdown({
      guidelines: INITIAL_WRITING_GUIDELINES,
      contentType: 'product_entry',
      taskInstructions: 'Draft entry',
      productOrGuideContext: 'Context sample',
      examples: modifiedExamples
    });

    assert.ok(
      breakdown.fullComposedPrompt.includes('Custom Curated Bronze Astrolabe Entry'),
      'Composed prompt must include newly added example'
    );
    assert.strictEqual(
      breakdown.fullComposedPrompt.includes(INITIAL_WRITING_EXAMPLES_LIST[0].title),
      false,
      'Composed prompt must NOT include deleted default example'
    );

    console.log('✓ Test 3 passed: Adding custom example while deleting default example preserves remaining & new items.');
    passed++;
  }

  // Test 4: Export/Import roundtrip preserves deleted examples state permanently
  {
    const deletedStateExamples = INITIAL_WRITING_EXAMPLES_LIST.slice(0, 1); // Only keep 1 example
    const exportPayload = createWritingGuidelinesExport(INITIAL_WRITING_GUIDELINES, deletedStateExamples);
    const jsonString = JSON.stringify(exportPayload, null, 2);

    const result = validateWritingGuidelinesImport(jsonString, INITIAL_WRITING_GUIDELINES, INITIAL_WRITING_EXAMPLES_LIST);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.payload?.examples.length, 1);
    assert.strictEqual(result.payload?.examples[0].id, INITIAL_WRITING_EXAMPLES_LIST[0].id);

    console.log('✓ Test 4 passed: Export/Import roundtrip preserves deleted default examples state.');
    passed++;
  }

  console.log(`\nAll ${passed} deletion tests completed successfully!`);
}

runTests().catch((err) => {
  console.error('Deletion test suite failed:', err);
  process.exit(1);
});
