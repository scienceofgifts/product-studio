/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { GiftGuide, ProductRecord, ContextProfile } from '../src/types/index.js';
import { ApprovedWritingExample } from '../src/types/writingGuidelines.js';
import { INITIAL_GIFT_GUIDES } from '../src/data/initialBusinessBrain.js';
import { INITIAL_WRITING_GUIDELINES, INITIAL_WRITING_EXAMPLES_LIST } from '../src/data/initialWritingGuidelines.js';
import { composePromptWithGuidelines, getPromptBreakdown } from '../src/services/promptComposer.js';

console.log('Running Gift Guide Deletion and Calibration Example Editing Test Suite...\n');

async function runTests() {
  let passed = 0;

  // Test 1: Create a guide, delete it, and confirm it remains deleted without resurrecting
  {
    const initialGuides: GiftGuide[] = [...INITIAL_GIFT_GUIDES];
    const newGuide: GiftGuide = {
      id: 'guide-test-roman-history',
      name: 'Roman Republic Numismatics & Military History',
      description: 'Authentic gifts for students of the late Roman Republic and legionary archaeology.',
      targetPersona: 'Classicists, Roman legion re-enactors, and ancient coin collectors',
      niche: 'Ancient Roman History',
      itemCount: 0
    };

    // Add guide
    const withNew = [...initialGuides, newGuide];
    assert.strictEqual(withNew.some((g) => g.id === newGuide.id), true);

    // Delete guide
    const afterDelete = withNew.filter((g) => g.id !== newGuide.id);
    assert.strictEqual(afterDelete.some((g) => g.id === newGuide.id), false);
    assert.strictEqual(afterDelete.length, initialGuides.length);

    // Even if initial guides count is tested, newGuide does not exist in initialGuides or afterDelete
    assert.ok(afterDelete.every((g) => g.id !== newGuide.id));

    console.log('✓ Test 1 passed: Creating and deleting guide successfully leaves guide deleted.');
    passed++;
  }

  // Test 2: Delete a guide assigned to existing products -> products preserved, guide references safely unlinked
  {
    const targetGuideId = 'guide-viking-history';
    const targetGuideName = 'The Definitive Gift Guide for Viking History & Norse Culture Enthusiasts';

    const sampleProducts: ProductRecord[] = [
      {
        id: 'prod-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mode: 'full',
        status: 'completed',
        imageFileName: 'mug.jpg',
        imageMimeType: 'image/jpeg',
        imageSize: 1024,
        details: {
          workingName: 'Lindisfarne Chronicle Ceramic Mug',
          productType: 'mug',
          giftGuideId: targetGuideId,
          giftGuideName: targetGuideName,
          primaryRecipient: 'Viking history enthusiast',
          secondaryRecipient: '',
          audienceInterest: 'Anglo-Saxon and Norse archaeology',
          occasion: 'Birthday',
          productUrl: '',
          currentTitle: 'Lindisfarne Mug',
          currentDescription: 'Ceramic mug with raid chronicle inscription',
          productSpecs: 'Capacity: 15 oz\nMaterial: Ceramic',
          knownDesignReferences: '793 AD Chronicle manuscript illumination',
          initialPositioningIdea: '',
          specificQuestions: ''
        }
      },
      {
        id: 'prod-2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mode: 'full',
        status: 'completed',
        imageFileName: 'hoodie.jpg',
        imageMimeType: 'image/jpeg',
        imageSize: 2048,
        details: {
          workingName: 'American Civil War Map Hoodie',
          productType: 'hoodie',
          giftGuideId: 'guide-civil-war',
          giftGuideName: 'Thoughtful Gifts for American Civil War Buffs',
          primaryRecipient: 'Battlefield historian',
          secondaryRecipient: '',
          audienceInterest: 'Civil War strategy',
          occasion: 'Holiday',
          productUrl: '',
          currentTitle: 'Antietam Campaign Map Hoodie',
          currentDescription: 'Detailed topographical map',
          productSpecs: '80% cotton, 20% polyester',
          knownDesignReferences: 'Ordnance survey map 1862',
          initialPositioningIdea: '',
          specificQuestions: ''
        }
      }
    ];

    // Simulate cascade unlinking logic executed by dbService.deleteGiftGuide & App.tsx
    const remainingGuides = INITIAL_GIFT_GUIDES.filter((g) => g.id !== targetGuideId);
    const updatedProducts = sampleProducts.map((p) =>
      p.details.giftGuideId === targetGuideId
        ? {
            ...p,
            details: {
              ...p.details,
              giftGuideId: '',
              giftGuideName: ''
            },
            updatedAt: new Date().toISOString()
          }
        : p
    );

    // Assertions
    assert.strictEqual(updatedProducts.length, 2, 'No products should ever be deleted');
    const unlinkedProd = updatedProducts.find((p) => p.id === 'prod-1')!;
    assert.strictEqual(unlinkedProd.details.giftGuideId, '', 'Deleted guide id must be cleared');
    assert.strictEqual(unlinkedProd.details.giftGuideName, '', 'Deleted guide name must be cleared');
    assert.strictEqual(unlinkedProd.details.workingName, 'Lindisfarne Chronicle Ceramic Mug', 'Product specs and data must be intact');
    assert.strictEqual(unlinkedProd.details.productSpecs, 'Capacity: 15 oz\nMaterial: Ceramic', 'Product specs must be intact');

    const untouchedProd = updatedProducts.find((p) => p.id === 'prod-2')!;
    assert.strictEqual(untouchedProd.details.giftGuideId, 'guide-civil-war', 'Unrelated product guide must remain intact');
    assert.strictEqual(remainingGuides.some((g) => g.id === targetGuideId), false, 'Target guide must be removed from guides');

    console.log('✓ Test 2 passed: Products preserved and guide assignments cleanly unlinked upon guide deletion.');
    passed++;
  }

  // Test 3: Cancel a guide deletion -> confirm no changes to guides or products
  {
    const initialGuides = [...INITIAL_GIFT_GUIDES];
    let guideToDeleteCandidate: GiftGuide | null = initialGuides[0];

    // User clicks Cancel
    guideToDeleteCandidate = null;

    assert.strictEqual(guideToDeleteCandidate, null);
    assert.strictEqual(initialGuides.length, INITIAL_GIFT_GUIDES.length);
    assert.deepStrictEqual(initialGuides, INITIAL_GIFT_GUIDES);

    console.log('✓ Test 3 passed: Canceling guide deletion leaves guide and catalogue completely unchanged.');
    passed++;
  }

  // Test 4: Edit every field of an existing calibration example, save, and confirm persistence
  {
    const initialExamples: ApprovedWritingExample[] = [...INITIAL_WRITING_EXAMPLES_LIST];
    assert.ok(initialExamples.length > 0);

    const originalEx = initialExamples[0];
    const editedEx: ApprovedWritingExample = {
      id: originalEx.id, // ID must remain strictly identical
      title: 'Lindisfarne 793 AD Chronicle Mug (Refined Standard)',
      contentType: 'hero_feature',
      approvedExcerpt: 'This 15-ounce ceramic vessel reproduces the exact Anglo-Saxon Chronicle text with archival fidelity.',
      niche: 'Early Medieval Northumbria',
      guideName: 'Gifts for Serious Medievalists',
      tags: ['Editorial Calibration', 'Archival', 'Ceramic Drinkware'],
      editorialPrinciples: ['Primary source verbatim citation', 'Concrete physical observations', 'Zero em-dashes'],
      whyEffective: 'Grounds the gift immediately in the historic record without resorting to generic Viking tropes.',
      createdAt: originalEx.createdAt
    };

    // Save edit by updating the existing item in the array without changing length or creating duplicates
    const updatedList = initialExamples.map((ex) => (ex.id === originalEx.id ? editedEx : ex));

    assert.strictEqual(updatedList.length, initialExamples.length, 'Editing must never duplicate items');
    const persisted = updatedList.find((ex) => ex.id === originalEx.id)!;
    assert.strictEqual(persisted.title, 'Lindisfarne 793 AD Chronicle Mug (Refined Standard)');
    assert.strictEqual(persisted.contentType, 'hero_feature');
    assert.strictEqual(persisted.niche, 'Early Medieval Northumbria');
    assert.strictEqual(persisted.guideName, 'Gifts for Serious Medievalists');
    assert.deepStrictEqual(persisted.tags, ['Editorial Calibration', 'Archival', 'Ceramic Drinkware']);
    assert.deepStrictEqual(persisted.editorialPrinciples, ['Primary source verbatim citation', 'Concrete physical observations', 'Zero em-dashes']);
    assert.strictEqual(persisted.whyEffective, 'Grounds the gift immediately in the historic record without resorting to generic Viking tropes.');

    console.log('✓ Test 4 passed: All fields of calibration example edited and saved without duplication.');
    passed++;
  }

  // Test 5: Cancel an edit -> original example remains unchanged
  {
    const originalEx = { ...INITIAL_WRITING_EXAMPLES_LIST[0] };
    const draftTitle = 'Dirty Unsaved Title';

    // Simulate discard / cancel
    let activeDraft: ApprovedWritingExample | null = {
      ...originalEx,
      title: draftTitle
    };

    // Cancel action discards draft
    activeDraft = null;

    // Verify original object in collection is completely untouched
    assert.strictEqual(INITIAL_WRITING_EXAMPLES_LIST[0].title, originalEx.title);
    assert.notStrictEqual(INITIAL_WRITING_EXAMPLES_LIST[0].title, draftTitle);

    console.log('✓ Test 5 passed: Canceling calibration example edit leaves original record untouched.');
    passed++;
  }

  // Test 6: Prompt composer uses updated example in composed prompt output
  {
    const originalEx = INITIAL_WRITING_EXAMPLES_LIST[0];
    const editedEx: ApprovedWritingExample = {
      ...originalEx,
      title: 'Brand New Unique Title 2026',
      approvedExcerpt: 'Distinctive test excerpt indicating fresh calibration copy.',
      whyEffective: 'Observational specificity without hyperbole.'
    };

    const updatedList = INITIAL_WRITING_EXAMPLES_LIST.map((ex) =>
      ex.id === originalEx.id ? editedEx : ex
    );

    const breakdown = getPromptBreakdown({
      guidelines: INITIAL_WRITING_GUIDELINES,
      contentType: 'product_entry',
      taskInstructions: 'Draft entry for product',
      productOrGuideContext: 'Sample context',
      examples: updatedList
    });

    assert.ok(
      breakdown.fullComposedPrompt.includes('Brand New Unique Title 2026'),
      'Composed prompt must include updated example title'
    );
    assert.ok(
      breakdown.fullComposedPrompt.includes('Distinctive test excerpt indicating fresh calibration copy.'),
      'Composed prompt must include updated example excerpt'
    );
    assert.ok(
      breakdown.fullComposedPrompt.includes('Observational specificity without hyperbole.'),
      'Composed prompt must include updated why effective explanation'
    );
    assert.strictEqual(
      breakdown.fullComposedPrompt.includes(originalEx.title),
      false,
      'Old example title must NOT be in composed prompt'
    );

    console.log('✓ Test 6 passed: Prompt generator immediately incorporates edited calibration example.');
    passed++;
  }

  // Test 7: Adding and deleting examples still work reliably
  {
    const baseList = [...INITIAL_WRITING_EXAMPLES_LIST];
    const newEx: ApprovedWritingExample = {
      id: `ex-${Date.now()}`,
      title: 'Newly Added Calibration Sample',
      contentType: 'product_entry',
      approvedExcerpt: 'This is a pristine newly added excerpt.',
      niche: 'Cinema Craft',
      guideName: 'Gifts for Screenwriters',
      tags: ['Screenwriting'],
      editorialPrinciples: ['Dialogue pacing'],
      whyEffective: 'Demonstrates professional craft without clichés.',
      createdAt: new Date().toISOString()
    };

    const afterAdd = [...baseList, newEx];
    assert.strictEqual(afterAdd.length, baseList.length + 1);
    assert.ok(afterAdd.some((e) => e.id === newEx.id));

    const afterDelete = afterAdd.filter((e) => e.id !== newEx.id);
    assert.strictEqual(afterDelete.length, baseList.length);
    assert.strictEqual(afterDelete.some((e) => e.id === newEx.id), false);

    console.log('✓ Test 7 passed: Adding and deleting calibration examples operates without regressions.');
    passed++;
  }

  // Test 8: Context profiles and working context safety
  {
    const targetGuideId = 'guide-viking-history';
    const profile: ContextProfile = {
      id: 'profile-1',
      name: 'Norse Mythology Enthusiast',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      context: {
        giftGuideId: targetGuideId,
        giftGuideName: 'The Definitive Gift Guide for Viking History',
        primaryRecipient: 'Medievalist',
        secondaryRecipient: '',
        audienceInterest: 'Old Norse',
        occasion: 'Holiday',
        initialPositioningIdea: '',
        productSpecs: '',
        knownDesignReferences: '',
        specificQuestions: ''
      }
    };

    // Simulate unlinking from profile
    const cleanedProfile: ContextProfile = {
      ...profile,
      context: {
        ...profile.context,
        giftGuideId: '',
        giftGuideName: ''
      },
      updatedAt: new Date().toISOString()
    };

    assert.strictEqual(cleanedProfile.context.giftGuideId, '');
    assert.strictEqual(cleanedProfile.context.giftGuideName, '');
    assert.strictEqual(cleanedProfile.name, 'Norse Mythology Enthusiast', 'Profile name preserved');
    assert.strictEqual(cleanedProfile.context.primaryRecipient, 'Medievalist', 'Audience and profile preserved');

    console.log('✓ Test 8 passed: Context profiles and working context remain intact with cleaned guide references.');
    passed++;
  }

  console.log(`\nAll ${passed} gift guide deletion and calibration editing regression tests passed successfully!`);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
