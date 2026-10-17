/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProductRecord,
  ProductComparisonResult,
  SimilarityCategory,
  DimensionAssessment,
  ComparisonFeedback
} from '../types';

/**
 * Normalizes text for keyword and token comparison.
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Calculates Jaccard similarity between two token arrays.
 */
function jaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection++;
  });
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Generates an alphabetically ordered pair key to identify comparisons regardless of argument order.
 */
export function getComparisonKey(idA: string, idB: string): string {
  return [idA, idB].sort().join('___');
}

/**
 * Evaluates Subject Similarity:
 * Determines whether products concern the same historical event, person, civilization, mythology, or hobby.
 * Shared subject matter alone MUST NOT establish that two products are duplicates.
 */
function evaluateSubjectDimension(prodA: ProductRecord, prodB: ProductRecord): DimensionAssessment {
  const nicheA = prodA.details.audienceInterest || prodA.details.giftGuideName || '';
  const nicheB = prodB.details.audienceInterest || prodB.details.giftGuideName || '';
  const tokensA = tokenize(nicheA + ' ' + (prodA.details.knownDesignReferences || '') + ' ' + (prodA.details.workingName || ''));
  const tokensB = tokenize(nicheB + ' ' + (prodB.details.knownDesignReferences || '') + ' ' + (prodB.details.workingName || ''));

  const evidence: string[] = [];
  const differences: string[] = [];

  const sameGuide = prodA.details.giftGuideId && prodA.details.giftGuideId === prodB.details.giftGuideId;
  if (sameGuide) {
    evidence.push(`Both assigned to guide: "${prodA.details.giftGuideName}"`);
  }

  // Check specific historical/niche subjects
  const subjects = [
    { key: 'viking', label: 'Viking History & Norse Culture' },
    { key: 'civil war', label: 'American Civil War' },
    { key: 'gettysburg', label: 'Battle of Gettysburg' },
    { key: 'spartan', label: 'Ancient Greece / Spartan History' },
    { key: 'odyssey', label: 'Homeric Classics & Odyssey' },
    { key: 'spitfire', label: 'WWII Aviation' },
    { key: 'merlin', label: 'Rolls-Royce Merlin Engineering' },
    { key: 'futhark', label: 'Runic Epigraphy' },
    { key: 'film', label: 'Cinema & Directing' }
  ];

  let sharedSubjectCount = 0;
  const textA = (prodA.details.workingName + ' ' + prodA.details.audienceInterest + ' ' + prodA.details.knownDesignReferences).toLowerCase();
  const textB = (prodB.details.workingName + ' ' + prodB.details.audienceInterest + ' ' + prodB.details.knownDesignReferences).toLowerCase();

  subjects.forEach((s) => {
    if (textA.includes(s.key) && textB.includes(s.key)) {
      sharedSubjectCount++;
      evidence.push(`Both touch on ${s.label}`);
    } else if (textA.includes(s.key) !== textB.includes(s.key)) {
      differences.push(`Product A focuses on ${textA.includes(s.key) ? s.label : 'other subjects'}, whereas Product B does not`);
    }
  });

  const overlap = jaccardSimilarity(tokensA, tokensB);

  let level: DimensionAssessment['level'] = 'none';
  let score = 1;
  let summary = 'Products address distinct historical subjects or eras.';

  if (sharedSubjectCount >= 2 || (sharedSubjectCount >= 1 && sameGuide)) {
    level = 'high';
    score = 8.5;
    summary = 'Products share a specific historical event, culture, or subject matter. (Note: Shared subject matter does not by itself imply conceptual duplication).';
  } else if (sharedSubjectCount === 1 || sameGuide || overlap > 0.15) {
    level = 'moderate';
    score = 5.5;
    summary = 'Products belong to related broader historical spheres but emphasize different specific chapters or entities.';
  } else if (overlap > 0.05) {
    level = 'low';
    score = 3.0;
    summary = 'Products share incidental thematic keywords but explore different historical areas.';
  }

  return {
    dimension: 'subject',
    dimensionName: 'Subject & Historical Era',
    level,
    score,
    summary,
    specificEvidence: evidence.length > 0 ? evidence : ['No significant historical subject overlap detected.'],
    meaningfulDifferences: differences.length > 0 ? differences : ['Both share subject-level historical terminology.']
  };
}

/**
 * Evaluates Conceptual Similarity:
 * Identifies whether products communicate substantially the same underlying idea, joke, reference, or intellectual appeal.
 */
function evaluateConceptualDimension(prodA: ProductRecord, prodB: ProductRecord): DimensionAssessment {
  const posA = (prodA.details.initialPositioningIdea || '') + ' ' + (prodA.details.currentDescription || '');
  const posB = (prodB.details.initialPositioningIdea || '') + ' ' + (prodB.details.currentDescription || '');

  const tokensA = tokenize(posA);
  const tokensB = tokenize(posB);

  const evidence: string[] = [];
  const differences: string[] = [];

  // Conceptual archetypes detection
  const hasAggressiveWarriorA = /valhalla|berserker|combat|warrior|axe|blood/i.test(posA + ' ' + prodA.details.workingName);
  const hasAggressiveWarriorB = /valhalla|berserker|combat|warrior|axe|blood/i.test(posB + ' ' + prodB.details.workingName);

  const hasScholarlyManuscriptA = /chronicle|primary source|manuscript|academic|archival|793|cotton/i.test(posA + ' ' + (prodA.details.knownDesignReferences || ''));
  const hasScholarlyManuscriptB = /chronicle|primary source|manuscript|academic|archival|793|cotton/i.test(posB + ' ' + (prodB.details.knownDesignReferences || ''));

  const hasLinguisticCraftA = /futhark|rune|epigraph|linguist|calligraph|journal/i.test(posA + ' ' + prodA.details.workingName);
  const hasLinguisticCraftB = /futhark|rune|epigraph|linguist|calligraph|journal/i.test(posB + ' ' + prodB.details.workingName);

  const hasTacticalCartographyA = /contour|topographic|survey|map|elevation|chamberlain/i.test(posA + ' ' + (prodA.details.knownDesignReferences || ''));
  const hasTacticalCartographyB = /contour|topographic|survey|map|elevation|chamberlain/i.test(posB + ' ' + (prodB.details.knownDesignReferences || ''));

  if (hasAggressiveWarriorA && hasAggressiveWarriorB) {
    evidence.push('Both products utilize the generic warrior / battle-glory pop-culture appeal.');
  }
  if (hasScholarlyManuscriptA && hasScholarlyManuscriptB) {
    evidence.push('Both products rely on authentic primary chronicle transcriptions for intellectual gravitas.');
  }
  if (hasAggressiveWarriorA !== hasAggressiveWarriorB) {
    differences.push(
      hasAggressiveWarriorA
        ? 'Product A uses pop-culture warrior tropes, whereas Product B avoids warrior clichés.'
        : 'Product B uses pop-culture warrior tropes, whereas Product A focuses on scholarly/subtle angles.'
    );
  }
  if (hasScholarlyManuscriptA !== hasScholarlyManuscriptB) {
    differences.push(
      hasScholarlyManuscriptA
        ? 'Product A is anchored in primary source chronicle documentation; Product B is not.'
        : 'Product B is anchored in primary source chronicle documentation; Product A is not.'
    );
  }
  if (hasLinguisticCraftA !== hasLinguisticCraftB && (hasLinguisticCraftA || hasLinguisticCraftB)) {
    differences.push('One product centers on linguistic & epigraphic literacy while the other focuses on material/battle history.');
  }

  const posOverlap = jaccardSimilarity(tokensA, tokensB);

  let level: DimensionAssessment['level'] = 'low';
  let score = 2.5;
  let summary = 'Products operate on fundamentally distinct intellectual or emotional concepts.';

  if (hasAggressiveWarriorA && hasAggressiveWarriorB) {
    level = 'high';
    score = 8.8;
    summary = 'Strong conceptual overlap: both products communicate the same warrior-identity appeal, risking repetitive catalogue positioning.';
  } else if (hasTacticalCartographyA && hasTacticalCartographyB) {
    level = 'moderate';
    score = 6.0;
    summary = 'Moderate conceptual overlap: both invoke Little Round Top cartography, though format differences modulate execution.';
  } else if (posOverlap > 0.25) {
    level = 'moderate';
    score = 5.8;
    summary = 'Moderate conceptual overlap in editorial pitch and tone.';
  } else if (differences.length >= 2) {
    level = 'low';
    score = 2.0;
    summary = 'Differentiated conceptual appeals: despite any subject overlap, they communicate completely different intellectual messages.';
  }

  return {
    dimension: 'conceptual',
    dimensionName: 'Underlying Concept & Tone',
    level,
    score,
    summary,
    specificEvidence: evidence.length > 0 ? evidence : ['Distinct conceptual rationales identified.'],
    meaningfulDifferences: differences.length > 0 ? differences : ['Minor nuances in conceptual execution.']
  };
}

/**
 * Evaluates Visual Similarity:
 * Where images and design notes exist, compares motifs, composition, typography, and illustration style.
 */
function evaluateVisualDimension(prodA: ProductRecord, prodB: ProductRecord): DimensionAssessment {
  const missingA = !prodA.imageDataUrl && !prodA.details.knownDesignReferences;
  const missingB = !prodB.imageDataUrl && !prodB.details.knownDesignReferences;

  if (missingA || missingB) {
    return {
      dimension: 'visual',
      dimensionName: 'Visual Design & Aesthetics',
      level: 'insufficient_data',
      score: null,
      summary: 'Insufficient visual data: one or both products lack uploaded image mockups or design reference notes.',
      specificEvidence: ['Visual comparison cannot be reliably performed without inspectable imagery or design notes.'],
      meaningfulDifferences: ['Visual differences unverified due to missing mockup assets.'],
      missingInformationNotices: [
        missingA ? `Product A (${prodA.details.workingName}) has no image mockup.` : '',
        missingB ? `Product B (${prodB.details.workingName}) has no image mockup.` : ''
      ].filter(Boolean)
    };
  }

  const designA = (prodA.details.knownDesignReferences || '').toLowerCase();
  const designB = (prodB.details.knownDesignReferences || '').toLowerCase();

  const evidence: string[] = [];
  const differences: string[] = [];

  if (prodA.details.productType === prodB.details.productType) {
    evidence.push(`Both share physical canvas format: ${prodA.details.productType}.`);
  } else {
    differences.push(`Different physical formats: Product A is a ${prodA.details.productType}, Product B is a ${prodB.details.productType}.`);
  }

  if (designA.includes('urnes') && designB.includes('urnes')) {
    evidence.push('Both utilize Urnes-style zoomorphic knotwork borders.');
  }
  if (designA.includes('topograph') && designB.includes('topograph')) {
    evidence.push('Both feature contour topographical survey line art.');
  }
  if (designA.includes('script') && designB.includes('script')) {
    evidence.push('Both highlight historical manuscript calligraphic script.');
  }

  if (designA.includes('distressed') !== designB.includes('distressed')) {
    differences.push('One design uses distressed modern pop-wear effects; the other uses clean archival rendering.');
  }
  if (designA.includes('canvas') !== designB.includes('canvas')) {
    differences.push('Contrasting material medium and framing presentation.');
  }

  let level: DimensionAssessment['level'] = 'low';
  let score = 2.5;
  let summary = 'Visual assets exhibit distinct graphic languages and layout compositions.';

  if (prodA.details.productType === prodB.details.productType && (designA.includes('pop') && designB.includes('pop'))) {
    level = 'high';
    score = 8.0;
    summary = 'Substantial visual overlap in graphic motifs and commercial styling.';
  } else if (evidence.length >= 2) {
    level = 'moderate';
    score = 5.5;
    summary = 'Moderate visual resonance in shared graphic motifs, though compositional layout differs.';
  }

  return {
    dimension: 'visual',
    dimensionName: 'Visual Design & Aesthetics',
    level,
    score,
    summary,
    specificEvidence: evidence.length > 0 ? evidence : ['Visually independent layouts and graphical styles.'],
    meaningfulDifferences: differences.length > 0 ? differences : ['Shared aesthetic parameters.']
  };
}

/**
 * Evaluates Recipient Similarity:
 * Determines whether products target substantially the same type of recipient (depth of interest, aesthetic taste, knowledge level).
 */
function evaluateRecipientDimension(prodA: ProductRecord, prodB: ProductRecord): DimensionAssessment {
  const recA = (prodA.details.primaryRecipient || '') + ' ' + (prodA.details.secondaryRecipient || '');
  const recB = (prodB.details.primaryRecipient || '') + ' ' + (prodB.details.secondaryRecipient || '');

  const missingA = !prodA.details.primaryRecipient;
  const missingB = !prodB.details.primaryRecipient;

  if (missingA || missingB) {
    return {
      dimension: 'recipient',
      dimensionName: 'Recipient Profile & Knowledge Depth',
      level: 'insufficient_data',
      score: null,
      summary: 'Insufficient recipient profile data provided for comparative audience evaluation.',
      specificEvidence: ['Primary recipient profile missing in one or more records.'],
      meaningfulDifferences: ['Cannot verify recipient overlap without persona definitions.'],
      missingInformationNotices: [
        missingA ? `Product A (${prodA.details.workingName}) has no primary recipient definition.` : '',
        missingB ? `Product B (${prodB.details.workingName}) has no primary recipient definition.` : ''
      ].filter(Boolean)
    };
  }

  const evidence: string[] = [];
  const differences: string[] = [];

  const isCasualA = /casual|fan|gamer|gym|pop-culture/i.test(recA);
  const isCasualB = /casual|fan|gamer|gym|pop-culture/i.test(recB);

  const isScholarA = /scholar|serious|student|academic|historian|researcher|collector/i.test(recA);
  const isScholarB = /scholar|serious|student|academic|historian|researcher|collector/i.test(recB);

  if (isCasualA && isCasualB) {
    evidence.push('Both products target casual interest fans and pop-culture enthusiasts.');
  }
  if (isScholarA && isScholarB) {
    evidence.push('Both products target serious researchers, academic students, or deep historical specialists.');
  }
  if (isCasualA !== isCasualB || isScholarA !== isScholarB) {
    differences.push(
      isScholarA
        ? 'Product A targets serious academic specialists/students; Product B targets casual pop-culture enthusiasts.'
        : 'Product B targets serious academic specialists/students; Product A targets casual pop-culture enthusiasts.'
    );
  }

  const overlap = jaccardSimilarity(tokenize(recA), tokenize(recB));

  let level: DimensionAssessment['level'] = 'low';
  let score = 2.0;
  let summary = 'Products target distinct recipient personas with contrasting levels of subject knowledge.';

  if ((isCasualA && isCasualB) || (isScholarA && isScholarB && overlap > 0.2)) {
    level = 'high';
    score = 8.5;
    summary = 'Significant recipient overlap: both designs compete for the exact same persona and depth-of-knowledge tier.';
  } else if (overlap > 0.15) {
    level = 'moderate';
    score = 5.0;
    summary = 'Adjacent recipient profiles: shared subject curiosity but differing in intensity or practical context.';
  }

  return {
    dimension: 'recipient',
    dimensionName: 'Recipient Profile & Knowledge Depth',
    level,
    score,
    summary,
    specificEvidence: evidence.length > 0 ? evidence : ['Contrasting recipient personas identified.'],
    meaningfulDifferences: differences.length > 0 ? differences : ['Shared recipient knowledge requirements.']
  };
}

/**
 * Evaluates Editorial Positioning Similarity:
 * Determines whether products would occupy the same role in a gift guide.
 */
function evaluateEditorialDimension(prodA: ProductRecord, prodB: ProductRecord): DimensionAssessment {
  const guideA = prodA.details.giftGuideName || 'Unassigned';
  const guideB = prodB.details.giftGuideName || 'Unassigned';

  const sameGuide = prodA.details.giftGuideId && prodA.details.giftGuideId === prodB.details.giftGuideId;
  const evidence: string[] = [];
  const differences: string[] = [];

  if (sameGuide) {
    evidence.push(`Both compete for curated placement in "${guideA}".`);
  } else {
    differences.push(`Different assigned editorial guides: "${guideA}" vs "${guideB}".`);
  }

  const roleA = (prodA.details.initialPositioningIdea || '').toLowerCase();
  const roleB = (prodB.details.initialPositioningIdea || '').toLowerCase();

  const isWorkstationA = /desk|office|notebook|journal|pad|ledger/i.test(roleA + ' ' + prodA.details.productType);
  const isWorkstationB = /desk|office|notebook|journal|pad|ledger/i.test(roleB + ' ' + prodB.details.productType);

  const isWearableA = prodA.details.productType === 't-shirt' || prodA.details.productType === 'hoodie';
  const isWearableB = prodB.details.productType === 't-shirt' || prodB.details.productType === 'hoodie';

  if (isWorkstationA && isWorkstationB) {
    evidence.push('Both occupy the reflective workspace/desk tool role in a collection.');
  }
  if (isWearableA && isWearableB) {
    evidence.push('Both occupy the everyday casual apparel role in a collection.');
  }
  if (isWorkstationA !== isWorkstationB || isWearableA !== isWearableB) {
    differences.push('Different gift utility: one serves wearable identity while the other serves functional desk/study use.');
  }

  let level: DimensionAssessment['level'] = 'none';
  let score = 1.0;
  let summary = 'Products fulfill distinct editorial roles across disparate guide sections.';

  if (sameGuide && ((isWorkstationA && isWorkstationB) || (isWearableA && isWearableB))) {
    level = 'high';
    score = 8.7;
    summary = 'Direct editorial competition: products fulfill the exact same role in the same guide, risking guide redundancy.';
  } else if (sameGuide) {
    level = 'moderate';
    score = 5.2;
    summary = 'Guide co-habitants: products share the same guide but offer complementary product categories or price points.';
  }

  return {
    dimension: 'editorial',
    dimensionName: 'Editorial Role & Gift Guide Fit',
    level,
    score,
    summary,
    specificEvidence: evidence.length > 0 ? evidence : ['Products occupy distinct editorial roles.'],
    meaningfulDifferences: differences.length > 0 ? differences : ['Direct overlap in editorial guide positioning.']
  };
}

/**
 * Evaluates Product Format Similarity:
 * Compares physical format (drinkware, apparel, stationery, poster, etc.).
 */
function evaluateFormatDimension(prodA: ProductRecord, prodB: ProductRecord): DimensionAssessment {
  const formatA = prodA.details.productType;
  const formatB = prodB.details.productType;

  const sameFormat = formatA === formatB;

  return {
    dimension: 'format',
    dimensionName: 'Product Physical Format',
    level: sameFormat ? 'identical' : 'none',
    score: sameFormat ? 10.0 : 0.0,
    summary: sameFormat
      ? `Both products share the exact physical format (${formatA}). Format similarity alone does not establish duplication.`
      : `Different physical product formats (${formatA} vs ${formatB}). Format differences provide natural product variety.`,
    specificEvidence: [sameFormat ? `Matching form factor: ${formatA}` : `Format A: ${formatA}, Format B: ${formatB}`],
    meaningfulDifferences: [sameFormat ? 'No format distinction.' : `Divergent tactile utility and price band.`]
  };
}

/**
 * Executes transparent multidimensional product similarity calculation.
 * Returns structured, explainable results with evidence and positioning recommendations.
 */
export function compareProducts(
  productA: ProductRecord,
  productB: ProductRecord,
  storedFeedback?: ComparisonFeedback | null
): ProductComparisonResult {
  const comparisonKey = getComparisonKey(productA.id, productB.id);

  // Evaluate all 6 dimensions
  const subjectDim = evaluateSubjectDimension(productA, productB);
  const conceptualDim = evaluateConceptualDimension(productA, productB);
  const visualDim = evaluateVisualDimension(productA, productB);
  const recipientDim = evaluateRecipientDimension(productA, productB);
  const editorialDim = evaluateEditorialDimension(productA, productB);
  const formatDim = evaluateFormatDimension(productA, productB);

  // Calculate transparent heuristic score (0-100)
  // Weights reflect internal strategic priorities: Conceptual (30%), Recipient (25%), Subject (15%), Editorial (15%), Visual (10%), Format (5%)
  const validScores: { score: number; weight: number }[] = [];
  if (conceptualDim.score !== null) validScores.push({ score: conceptualDim.score, weight: 0.30 });
  if (recipientDim.score !== null) validScores.push({ score: recipientDim.score, weight: 0.25 });
  if (subjectDim.score !== null) validScores.push({ score: subjectDim.score, weight: 0.15 });
  if (editorialDim.score !== null) validScores.push({ score: editorialDim.score, weight: 0.15 });
  if (visualDim.score !== null) validScores.push({ score: visualDim.score, weight: 0.10 });
  if (formatDim.score !== null) validScores.push({ score: formatDim.score, weight: 0.05 });

  const totalWeight = validScores.reduce((acc, v) => acc + v.weight, 0);
  const rawWeightedScore =
    totalWeight > 0 ? (validScores.reduce((acc, v) => acc + v.score * v.weight, 0) / totalWeight) * 10 : null;

  const heuristicScore = rawWeightedScore !== null ? Math.round(rawWeightedScore) : null;

  // Determine qualitative similarity category
  let overallCategory: SimilarityCategory = 'unrelated';
  let categoryLabel = 'Unrelated Products';
  let qualitativeAssessment = 'These products inhabit different subjects and appeal to unrelated gift situations.';
  let positioningImplications = 'Can be developed and published without any coordination or overlap concerns.';
  let recommendedAction = 'No action needed. Safe to proceed.';

  // Check for near-duplicate: identical or high conceptual + high recipient + high subject
  if (
    conceptualDim.level === 'high' &&
    (recipientDim.level === 'high' || recipientDim.level === 'moderate') &&
    subjectDim.level === 'high'
  ) {
    overallCategory = 'near_duplicate';
    categoryLabel = 'Near-Duplicate Concepts';
    qualitativeAssessment =
      'These designs communicate substantially the same underlying motif and target the same recipient persona, even if visual execution or physical product format differs.';
    positioningImplications =
      'Including both in the same guide creates self-cannibalization. Gift buyers will view them as repetitive variations of the same idea.';
    recommendedAction =
      'Consolidate or differentiate: Select the stronger product for the guide, or pivot one design toward a distinct intellectual angle (e.g. historical citation rather than warrior pop-tropes).';
  } else if (
    (conceptualDim.level === 'high' || recipientDim.level === 'high') &&
    (subjectDim.level === 'high' || subjectDim.level === 'moderate')
  ) {
    overallCategory = 'strongly_overlapping';
    categoryLabel = 'Strongly Overlapping Products';
    qualitativeAssessment =
      'Significant overlap in either conceptual message or target recipient profile. Both designs compete for the same gift-giving purchase intent.';
    positioningImplications =
      'Buyers may struggle to decide which product is more appropriate, reducing confidence in the curation.';
    recommendedAction =
      'Differentiate editorial framing in the writing brief so each product emphasizes a distinct sub-niche or gifting motivation.';
  } else if (subjectDim.level === 'high' && conceptualDim.level === 'low') {
    overallCategory = 'distinct_positioning';
    categoryLabel = 'Related Products with Distinct Positioning';
    qualitativeAssessment =
      'Both products address the same historical subject or era, but communicate fundamentally different appeals (e.g. primary manuscript scholarship vs epigraphic craft vs casual humor).';
    positioningImplications =
      'Healthy catalogue diversity: They enrich the same gift guide by serving different recipient knowledge depths without redundancy.';
    recommendedAction =
      'Emphasize the unique intellectual angle of each in writing briefs to clearly signal who each is for.';
  } else if (subjectDim.level === 'high' || subjectDim.level === 'moderate') {
    if (formatDim.level === 'none') {
      overallCategory = 'complementary';
      categoryLabel = 'Complementary Products';
      qualitativeAssessment =
        'Products share cultural subject context but differ in format and specific use case, allowing them to complement each other in a curated guide or collection.';
      positioningImplications =
        'Offers bundle or companion gift potential (e.g. desk journal paired with a morning mug).';
      recommendedAction =
        'Consider internal cross-linking or pairing in the editorial guide.';
    } else {
      overallCategory = 'distinct_positioning';
      categoryLabel = 'Related Products with Distinct Positioning';
      qualitativeAssessment = 'Shared cultural subject with distinguished appeal facets.';
      positioningImplications = 'Provide distinct options within the collection.';
      recommendedAction = 'Ensure distinct title angles in writing briefs.';
    }
  }

  // Apply stored user feedback adjustment if present
  if (storedFeedback && storedFeedback.adjustedCategory) {
    overallCategory = storedFeedback.adjustedCategory;
    categoryLabel =
      overallCategory === 'near_duplicate'
        ? 'Near-Duplicate Concepts (User Overridden)'
        : overallCategory === 'strongly_overlapping'
        ? 'Strongly Overlapping (User Overridden)'
        : overallCategory === 'distinct_positioning'
        ? 'Distinct Positioning (User Overridden)'
        : overallCategory === 'complementary'
        ? 'Complementary (User Overridden)'
        : 'Unrelated (User Overridden)';
    qualitativeAssessment += ` [Editorial adjustment applied by user: "${storedFeedback.userNotes}"]`;
  }

  // Synthesize key similarities & differences
  const keySimilarities: string[] = [
    ...subjectDim.specificEvidence,
    ...conceptualDim.specificEvidence,
    ...recipientDim.specificEvidence
  ].filter((s) => !s.toLowerCase().includes('no significant') && !s.toLowerCase().includes('cannot be reliably'));

  const keyDifferences: string[] = [
    ...subjectDim.meaningfulDifferences,
    ...conceptualDim.meaningfulDifferences,
    ...recipientDim.meaningfulDifferences,
    ...formatDim.meaningfulDifferences
  ].filter((d) => !d.toLowerCase().includes('no format distinction'));

  // Missing information warnings
  const missingWarnings: string[] = [
    ...(visualDim.missingInformationNotices || []),
    ...(recipientDim.missingInformationNotices || [])
  ];

  const confidence: 'high' | 'medium' | 'low' =
    missingWarnings.length >= 2 ? 'low' : missingWarnings.length === 1 ? 'medium' : 'high';

  return {
    id: `comp_${comparisonKey}_${Date.now().toString(36)}`,
    comparisonKey,
    productAId: productA.id,
    productAName: productA.details.workingName || 'Untitled Product A',
    productAFormat: productA.details.productType,
    productAGuide: productA.details.giftGuideName || 'Unassigned',
    productBId: productB.id,
    productBName: productB.details.workingName || 'Untitled Product B',
    productBFormat: productB.details.productType,
    productBGuide: productB.details.giftGuideName || 'Unassigned',
    overallCategory,
    categoryLabel,
    heuristicScore,
    qualitativeAssessment,
    dimensions: {
      subject: subjectDim,
      conceptual: conceptualDim,
      visual: visualDim,
      recipient: recipientDim,
      editorial: editorialDim,
      format: formatDim
    },
    keySimilarities: keySimilarities.length > 0 ? keySimilarities : ['No substantive similarities noted.'],
    keyDifferences: keyDifferences.length > 0 ? keyDifferences : ['No major distinguishing factors identified.'],
    positioningImplications,
    recommendedAction,
    confidence,
    missingInformationWarnings: missingWarnings,
    calculatedAt: new Date().toISOString(),
    engine: 'deterministic_rules_v1',
    userFeedback: storedFeedback || undefined
  };
}

/**
 * Compares a candidate product against all existing products in the catalogue.
 * Uses deterministic filtering to return only the most relevant candidates (e.g. top 5).
 */
export function findRelevantCatalogueMatches(
  targetProduct: ProductRecord,
  catalogue: ProductRecord[],
  storedFeedbackMap: Map<string, ComparisonFeedback> = new Map()
): ProductComparisonResult[] {
  const otherProducts = catalogue.filter((p) => p.id !== targetProduct.id);
  if (otherProducts.length === 0) return [];

  const comparisons = otherProducts.map((p) => {
    const key = getComparisonKey(targetProduct.id, p.id);
    const feedback = storedFeedbackMap.get(key) || null;
    return compareProducts(targetProduct, p, feedback);
  });

  // Sort by heuristic score descending, with near_duplicate and strongly_overlapping prioritized
  comparisons.sort((a, b) => {
    const priority = (cat: SimilarityCategory) => {
      switch (cat) {
        case 'near_duplicate':
          return 5;
        case 'strongly_overlapping':
          return 4;
        case 'distinct_positioning':
          return 3;
        case 'complementary':
          return 2;
        case 'unrelated':
          return 1;
      }
    };
    const pA = priority(a.overallCategory);
    const pB = priority(b.overallCategory);
    if (pA !== pB) return pB - pA;
    return (b.heuristicScore || 0) - (a.heuristicScore || 0);
  });

  return comparisons;
}
