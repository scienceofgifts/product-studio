/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {
  parseProductFactsFromHtml,
  mergeProductFacts,
  formatProductFactsForWriter,
  reconcileWritingBriefWithFacts
} from '../src/services/productFactsService.js';
import { StructuredProductFacts } from '../src/types/productFacts.js';
import { ChatGPTWritingBrief } from '../src/types/index.js';

console.log('Running Product Facts Pipeline Regression Test Suite...\n');

// Mock HTML Fixtures
const DIAGNOSTIC_HOODIE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Super History Teacher Hoodie, Cobalt Heavyweight Fleece Pullover | Science of Gifts</title>
  <meta name="description" content="A cobalt blue pullover hoodie in 80% cotton and 20% recycled polyester fleece, with heavyweight 9.4 oz fabric. It has a relaxed fit with dropped shoulders, a lined hood with no drawcord, a front kangaroo pocket, ribbed sleeve cuffs, and a tear-away tag. Sizes run from S to 3XL." />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Super History Teacher Hoodie, Cobalt Heavyweight Fleece Pullover",
    "description": "A cobalt blue pullover hoodie in 80% cotton and 20% recycled polyester fleece, with heavyweight 9.4 oz fabric. It has a relaxed fit with dropped shoulders, a lined hood with no drawcord, a front kangaroo pocket, ribbed sleeve cuffs, and a tear-away tag. Sizes run from S to 3XL.",
    "offers": [
      { "@type": "Offer", "name": "Cobalt, S", "price": "49.90" },
      { "@type": "Offer", "name": "Cobalt, 3XL", "price": "53.90" }
    ]
  }
  </script>
</head>
<body></body>
</html>
`;

const SPARSE_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Generic Historic Mug</title>
  <meta name="description" content="A simple ceramic coffee mug." />
</head>
<body></body>
</html>
`;

async function runTests() {
  let passed = 0;

  // Test 1: Successful parsing & extraction from structured metadata (Diagnostic Hoodie)
  {
    const facts = parseProductFactsFromHtml(
      DIAGNOSTIC_HOODIE_HTML,
      'https://shop.scienceofgifts.com/products/super-history-teacher-hoodie'
    );
    assert.strictEqual(facts.retrievalStatus, 'success');
    assert.strictEqual(facts.productType?.value, 'hoodie');
    assert.strictEqual(facts.color?.value, 'Cobalt');
    assert.strictEqual(facts.fabricComposition?.value, '80% cotton and 20% recycled polyester fleece');
    assert.ok(facts.fabricWeight?.value.includes('9.4 oz'));
    assert.strictEqual(facts.fit?.value, 'relaxed fit with dropped shoulders');
    assert.strictEqual(facts.hoodConstruction?.value, 'lined hood with no drawcord');
    assert.strictEqual(facts.pocketType?.value, 'front kangaroo pocket');
    assert.ok(facts.sizeRange?.value.includes('S') && facts.sizeRange?.value.includes('3XL'));
    assert.strictEqual(facts.price?.value, '$49.90 - $53.90');
    console.log('✓ Test 1 & 2 passed: Successful extraction of all diagnostic product attributes.');
    passed++;
  }

  // Test 3: Fallback extraction when JSON-LD is unavailable
  {
    const facts = parseProductFactsFromHtml(SPARSE_PAGE_HTML, 'https://shop.scienceofgifts.com/products/generic-mug');
    assert.strictEqual(facts.rawExtractedTitle, 'Generic Historic Mug');
    assert.strictEqual(facts.productType?.value, 'mug');
    assert.strictEqual(facts.fabricComposition, undefined);
    console.log('✓ Test 3 passed: Fallback extraction from standard meta tags working.');
    passed++;
  }

  // Test 4 & 7: Source provenance preservation
  {
    const facts = parseProductFactsFromHtml(
      DIAGNOSTIC_HOODIE_HTML,
      'https://shop.scienceofgifts.com/products/super-history-teacher-hoodie'
    );
    assert.strictEqual(facts.fabricComposition?.provenance, 'source-stated');
    assert.ok(facts.fabricComposition?.sourceRef?.includes('shop.scienceofgifts.com'));
    console.log('✓ Test 4 & 7 passed: Source provenance preserved accurately.');
    passed++;
  }

  // Test 5 & 8: Manual user overrides taking precedence
  {
    const facts = parseProductFactsFromHtml(
      DIAGNOSTIC_HOODIE_HTML,
      'https://shop.scienceofgifts.com/products/super-history-teacher-hoodie'
    );
    const merged = mergeProductFacts(facts, {
      fabricComposition: '100% Organic Heavyweight Cotton'
    });
    assert.strictEqual(merged.fabricComposition?.value, '100% Organic Heavyweight Cotton');
    assert.strictEqual(merged.fabricComposition?.provenance, 'user-provided');
    assert.strictEqual(merged.fabricComposition?.originalSourceValue, '80% cotton and 20% recycled polyester fleece');
    console.log('✓ Test 5 & 8 passed: Manual overrides take precedence with user-provided provenance.');
    passed++;
  }

  // Test 9 & 10: Writer prompt formatting & no marking known specs as unknown
  {
    const facts = parseProductFactsFromHtml(
      DIAGNOSTIC_HOODIE_HTML,
      'https://shop.scienceofgifts.com/products/super-history-teacher-hoodie'
    );
    const formatted = formatProductFactsForWriter(facts);
    assert.ok(formatted.includes('Fabric Weight: "heavyweight 9.4 oz fabric" [Provenance: source-stated]'));
    assert.ok(formatted.includes('Fabric Composition: "80% cotton and 20% recycled polyester fleece"'));
    assert.ok(formatted.includes('Pocket Style: "front kangaroo pocket"'));
    console.log('✓ Test 9 & 10 passed: Product facts formatted into prompt context without contradictions.');
    passed++;
  }

  // Test 11: Brief reconciliation & eliminating contradictions
  {
    const facts = parseProductFactsFromHtml(
      DIAGNOSTIC_HOODIE_HTML,
      'https://shop.scienceofgifts.com/products/super-history-teacher-hoodie'
    );

    const flawedBrief: ChatGPTWritingBrief = {
      briefTitle: 'Test Brief',
      generatedDate: '2026-10-15',
      productIdentity: { workingTitle: 'Super History Teacher Hoodie', productType: 'hoodie', suppliedSpecifications: '9.4 oz' },
      guideContext: { guideName: 'Test Guide', guidePurpose: 'Curate gifts' },
      recipientProfile: { primaryRecipient: 'History Teacher', knowledgeDepth: 'High', buyerMotivation: 'Appreciation' },
      recommendedTitles: { primary: 'Super History Teacher Hoodie', alternatives: [] },
      editorialAngle: { recommendedAngle: 'Academic crest superhero', strategicRationale: 'Unique', coreGoalOfEntry: 'Inform', distinctiveInclusionReason: 'High quality' },
      designDetailsToEmphasize: [],
      toneAndStyleDirection: [],
      confirmedSpecifications: [],
      missingInformationDoNotInvent: [
        'Fleece weight is unknown—do not invent',
        'Material composition is unverified'
      ],
      factsRequiringVerification: ['Confirm fabric weight'],
      claimsAndAssumptionsToAvoid: [],
      qualityControlChecklist: []
    };

    const reconciled = reconcileWritingBriefWithFacts(flawedBrief, facts);

    // Ensure 9.4 oz and 80/20 fleece are added to confirmedSpecifications
    assert.ok(reconciled.confirmedSpecifications.some((c) => c.includes('heavyweight 9.4 oz')));
    assert.ok(reconciled.confirmedSpecifications.some((c) => c.includes('80% cotton and 20% recycled polyester fleece')));

    // Ensure contradiction "fleece weight is unknown" was REMOVED
    assert.strictEqual(
      reconciled.missingInformationDoNotInvent?.some((m) => m.includes('weight')),
      false
    );
    assert.strictEqual(
      reconciled.factsRequiringVerification?.some((f) => f.includes('weight')),
      false
    );

    console.log('✓ Test 11 passed: Contradictions reconciled in ChatGPT writing brief.');
    passed++;
  }

  console.log(`\nAll ${passed} regression tests completed successfully!`);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
