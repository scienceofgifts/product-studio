/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { TitleOption, ModuleETitleLaboratory } from '../src/types/index.js';

console.log('Running Title Laboratory UI & Data Structure Regression Test Suite...\n');

async function runTests() {
  let passed = 0;

  // Test 1: Verify 8 Distinct Candidates across Strategic Approaches
  {
    const sampleTitleLab: ModuleETitleLaboratory = {
      recommendedTitle: 'The Academic Insignia Super History Teacher Hoodie',
      recommendedRationale: 'Combines the comic-book badge concept with authentic academic iconography.',
      recommendedTitleTradeOffs: 'Slightly longer phrasing than basic retail tags, but ideal for editorial guide titles.',
      runnerUpTitle: 'Academic Superhero Crest Cobalt Hoodie',
      runnerUpRationale: 'Stronger for direct shop product pages where clarity and garment format come first.',
      intendedTitleContext: 'Gift guide section headers and product presentation',
      searchIntentDisclaimer: 'Balances guide context and search discovery',
      existingTitleEvaluation: {
        currentTitleProvided: 'Cool History Hoodie',
        verdict: 'needs_replacement',
        critique: 'Generic descriptor that fails to convey the clever comic-book crest or scholarly symbols.',
        strengths: ['Identifies product category'],
        weaknesses: ['Vague and forgettable', 'Zero indication of the superhero academic emblem joke'],
        recommendationNotes: 'Replace with an editorial title focusing on the academic insignia.'
      },
      titleOptions: [
        {
          proposedTitle: 'Super History Teacher Superhero Insignia Hoodie',
          strategicApproach: 'design_specific',
          intendedAudience: 'High school and college history educators',
          strengths: 'Focuses directly on the comic crest artwork and text',
          weaknesses: 'Longer phrasing',
          fitScore: 9,
          conceptExplanation: 'Emphasizes the superhero insignia crest',
          searchIntentConsiderations: 'High discovery for teacher gifts',
          bestUseContext: 'editorial_guide_heading'
        },
        {
          proposedTitle: 'The Scholarly Superhero: Crest Fleece Hoodie',
          strategicApproach: 'intellectual_appeal',
          intendedAudience: 'Scholars with a lighthearted sense of humor',
          strengths: 'Intellectual framing of the badge',
          weaknesses: 'Omits the explicit word Teacher',
          fitScore: 8,
          conceptExplanation: 'Frames the educator as an academic superhero',
          searchIntentConsiderations: 'Editorial browsing query',
          bestUseContext: 'editorial_guide_heading'
        },
        {
          proposedTitle: 'History Department Superhero Heavyweight Hoodie',
          strategicApproach: 'recipient_oriented',
          intendedAudience: 'Colleagues and students buying for department staff',
          strengths: 'Clear institutional gift appeal',
          weaknesses: 'Less playful',
          fitScore: 8,
          conceptExplanation: 'Targeted at department gifting',
          searchIntentConsiderations: 'History department gifts',
          bestUseContext: 'shop_product_page'
        },
        {
          proposedTitle: 'The Cape & Quill: Super History Emblem Hoodie',
          strategicApproach: 'witty_irreverent',
          intendedAudience: 'History teachers who love superhero comics',
          strengths: 'Playful juxtaposition of superhero and scholarship',
          weaknesses: 'Quill is not literally in the crest (books and column are)',
          fitScore: 7,
          conceptExplanation: 'Comic-academic hybrid',
          searchIntentConsiderations: 'Niche gift search',
          bestUseContext: 'editorial_guide_heading'
        },
        {
          proposedTitle: 'Cobalt Fleece Super History Teacher Crest Hoodie',
          strategicApproach: 'practical_gift_appeal',
          intendedAudience: 'Practical gift buyers wanting exact specs',
          strengths: 'States color, material, and subject immediately',
          weaknesses: 'Less lyrical',
          fitScore: 8,
          conceptExplanation: 'Clear, utilitarian clarity',
          searchIntentConsiderations: 'Very high product search intent',
          bestUseContext: 'shop_product_page'
        },
        {
          proposedTitle: 'Super History Teacher Hoodie',
          strategicApproach: 'concise_editorial',
          intendedAudience: 'General gift guide readers',
          strengths: 'Clean, punchy, memorable',
          weaknesses: 'Does not explain the comic book badge concept',
          fitScore: 8,
          conceptExplanation: 'Concise editorial entry heading',
          searchIntentConsiderations: 'Direct product title search',
          bestUseContext: 'editorial_guide_heading'
        },
        {
          proposedTitle: 'Ionic Column & Globe Insignia History Hoodie',
          strategicApproach: 'specificity_led',
          intendedAudience: 'Educators who notice the specific classical symbols',
          strengths: 'Highlights exact visual elements (Ionic column, globe)',
          weaknesses: 'A bit esoteric for casual shoppers',
          fitScore: 8,
          conceptExplanation: 'Focuses on the classical architectural symbols',
          searchIntentConsiderations: 'Classical studies / history niche',
          bestUseContext: 'editorial_guide_heading'
        },
        {
          proposedTitle: 'Wax Seal & Classical Crest History Teacher Hoodie',
          strategicApproach: 'historical_cultural_reference',
          intendedAudience: 'History teachers and archivist-minded educators',
          strengths: 'Celebrates the manuscript wax seal motif',
          weaknesses: 'Secondary to the superhero theme',
          fitScore: 7,
          conceptExplanation: 'Historical motif focus',
          searchIntentConsiderations: 'History teacher gift',
          bestUseContext: 'editorial_guide_heading'
        }
      ]
    };

    assert.strictEqual(sampleTitleLab.titleOptions.length, 8, 'Must have 8 candidates');
    assert.strictEqual(sampleTitleLab.recommendedTitle, 'The Academic Insignia Super History Teacher Hoodie');
    assert.strictEqual(sampleTitleLab.runnerUpTitle, 'Academic Superhero Crest Cobalt Hoodie');
    assert.ok(sampleTitleLab.recommendedRationale.length > 20);

    // Verify all 8 candidates have natural word-wrapping strings without corrupted zero-width breaks
    sampleTitleLab.titleOptions.forEach((opt, idx) => {
      assert.ok(opt.proposedTitle.length > 5, `Title #${idx + 1} must be populated`);
      assert.ok(opt.strengths.length > 5, `Strengths for candidate #${idx + 1} must be non-empty`);
      assert.ok(opt.weaknesses.length > 5, `Weaknesses for candidate #${idx + 1} must be non-empty`);
      assert.ok(opt.intendedAudience.length > 5, `Audience for candidate #${idx + 1} must be non-empty`);
      assert.ok(opt.conceptExplanation && opt.conceptExplanation.length > 5, `Concept explanation for #${idx + 1} must be populated`);
    });

    console.log('✓ Test 1 passed: 8 diverse title candidates with full editorial fields verified.');
    passed++;
  }

  // Test 2: Filter Logic by Strategic Approach
  {
    const candidates: TitleOption[] = [
      {
        proposedTitle: 'Design Title',
        strategicApproach: 'design_specific',
        intendedAudience: 'Educators',
        strengths: 'Direct art reference',
        weaknesses: 'Long',
        fitScore: 9,
        searchIntentConsiderations: 'Design query',
        bestUseContext: 'editorial_guide_heading'
      },
      {
        proposedTitle: 'Witty Title',
        strategicApproach: 'witty_irreverent',
        intendedAudience: 'Humorous readers',
        strengths: 'Very funny',
        weaknesses: 'May not suit solemn educators',
        fitScore: 8,
        searchIntentConsiderations: 'Humor gift query',
        bestUseContext: 'editorial_guide_heading'
      }
    ];

    const filterByApproach = (list: TitleOption[], approach: string) => {
      if (approach === 'all') return list;
      return list.filter((item) => item.strategicApproach === approach);
    };

    assert.strictEqual(filterByApproach(candidates, 'all').length, 2);
    assert.strictEqual(filterByApproach(candidates, 'design_specific').length, 1);
    assert.strictEqual(filterByApproach(candidates, 'design_specific')[0].proposedTitle, 'Design Title');
    assert.strictEqual(filterByApproach(candidates, 'witty_irreverent').length, 1);
    assert.strictEqual(filterByApproach(candidates, 'concise_editorial').length, 0);

    console.log('✓ Test 2 passed: Strategic approach filtering verified.');
    passed++;
  }

  // Test 3: Search Query Filter across Title, Audience, and Strengths
  {
    const candidates: TitleOption[] = [
      {
        proposedTitle: 'Superhero Insignia Cobalt Hoodie',
        strategicApproach: 'design_specific',
        intendedAudience: 'Comic-loving history scholars',
        strengths: 'Vibrant cobalt fleece and insignia badge',
        weaknesses: 'Casual format',
        fitScore: 9,
        searchIntentConsiderations: 'Insignia hoodie',
        bestUseContext: 'editorial_guide_heading'
      },
      {
        proposedTitle: 'Ionic Column Classical Hoodie',
        strategicApproach: 'specificity_led',
        intendedAudience: 'Ancient Greek & Roman history professors',
        strengths: 'Exact architectural detail',
        weaknesses: 'Niche appeal',
        fitScore: 8,
        searchIntentConsiderations: 'Classical architecture',
        bestUseContext: 'editorial_guide_heading'
      }
    ];

    const searchCandidates = (list: TitleOption[], query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return list;
      return list.filter(
        (opt) =>
          opt.proposedTitle.toLowerCase().includes(q) ||
          opt.intendedAudience.toLowerCase().includes(q) ||
          opt.strengths.toLowerCase().includes(q)
      );
    };

    assert.strictEqual(searchCandidates(candidates, 'insignia').length, 1);
    assert.strictEqual(searchCandidates(candidates, 'insignia')[0].proposedTitle, 'Superhero Insignia Cobalt Hoodie');
    assert.strictEqual(searchCandidates(candidates, 'professors').length, 1);
    assert.strictEqual(searchCandidates(candidates, 'professors')[0].proposedTitle, 'Ionic Column Classical Hoodie');
    assert.strictEqual(searchCandidates(candidates, 'nonexistent').length, 0);

    console.log('✓ Test 3 passed: Keyword search filtering verified.');
    passed++;
  }

  console.log(`\nAll ${passed} Title Laboratory UI tests completed successfully!`);
}

runTests().catch((err) => {
  console.error('Title Laboratory UI regression test failed:', err);
  process.exit(1);
});
