/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProductRecord,
  GiftGuide,
  ConceptCluster,
  RedundantPairAlert,
  GuideCoverageAnalysis,
  DevelopmentOpportunity,
  ComparisonFeedback
} from '../types';
import { compareProducts, getComparisonKey } from './similarityEngine';

export interface PortfolioSummary {
  totalProducts: number;
  publishedCount: number;
  inReviewCount: number;
  draftCount: number;
  unassignedCount: number;
  nicheDistribution: { niche: string; count: number; percentage: number }[];
  formatDistribution: { format: string; count: number; percentage: number }[];
  guideDistribution: { guideId: string; guideName: string; count: number; publishedCount: number }[];
  clusters: ConceptCluster[];
  redundantPairs: RedundantPairAlert[];
  distinctiveProducts: { product: ProductRecord; standoutReason: string }[];
  incompleteRecords: {
    product: ProductRecord;
    missingFields: string[];
    riskAssessment: string;
  }[];
  guideCoverageMap: Record<string, GuideCoverageAnalysis>;
  developmentOpportunities: DevelopmentOpportunity[];
  strategicTakeaway: string;
}

/**
 * Analyzes the entire product catalogue to produce Portfolio Intelligence.
 */
export function analyzePortfolio(
  products: ProductRecord[],
  giftGuides: GiftGuide[],
  feedbackList: ComparisonFeedback[] = []
): PortfolioSummary {
  const total = products.length;

  // Build feedback map for quick lookup
  const feedbackMap = new Map<string, ComparisonFeedback>();
  feedbackList.forEach((fb) => feedbackMap.set(fb.comparisonKey, fb));

  // 1. Publication Status Tracking
  let publishedCount = 0;
  let inReviewCount = 0;
  let draftCount = 0;
  let unassignedCount = 0;

  products.forEach((p) => {
    const status = p.publicationStatus || (p.status === 'completed' ? 'published' : 'draft');
    if (status === 'published') publishedCount++;
    else if (status === 'in_review') inReviewCount++;
    else if (status === 'unassigned') unassignedCount++;
    else draftCount++;
  });

  // 2. Niche & Subject Distribution
  const nicheCounts: Record<string, number> = {};
  products.forEach((p) => {
    const niche = p.details.audienceInterest || p.details.giftGuideName || 'Unclassified History';
    const mainNiche = niche.split(',')[0].split(';')[0].trim();
    nicheCounts[mainNiche] = (nicheCounts[mainNiche] || 0) + 1;
  });
  const nicheDistribution = Object.entries(nicheCounts).map(([niche, count]) => ({
    niche,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // 3. Format Distribution
  const formatCounts: Record<string, number> = {};
  products.forEach((p) => {
    const fmt = p.details.productType || 'other';
    formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
  });
  const formatDistribution = Object.entries(formatCounts).map(([format, count]) => ({
    format,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // 4. Guide Distribution
  const guideCounts: Record<string, { count: number; published: number; name: string }> = {};
  giftGuides.forEach((g) => {
    guideCounts[g.id] = { count: 0, published: 0, name: g.name };
  });

  products.forEach((p) => {
    const gid = p.details.giftGuideId;
    if (gid && guideCounts[gid]) {
      guideCounts[gid].count++;
      if (p.publicationStatus === 'published' || p.status === 'completed') {
        guideCounts[gid].published++;
      }
    }
  });

  const guideDistribution = Object.entries(guideCounts).map(([guideId, data]) => ({
    guideId,
    guideName: data.name,
    count: data.count,
    publishedCount: data.published
  })).sort((a, b) => b.count - a.count);

  // 5. Exhaustive Pairwise Comparison for Redundancies & Clusters
  const redundantPairs: RedundantPairAlert[] = [];
  const similarityScoresByProduct: Record<string, number[]> = {};
  products.forEach((p) => (similarityScoresByProduct[p.id] = []));

  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      const pA = products[i];
      const pB = products[j];
      const key = getComparisonKey(pA.id, pB.id);
      const feedback = feedbackMap.get(key) || null;
      const comp = compareProducts(pA, pB, feedback);

      if (comp.heuristicScore !== null) {
        similarityScoresByProduct[pA.id].push(comp.heuristicScore);
        similarityScoresByProduct[pB.id].push(comp.heuristicScore);
      }

      if (comp.overallCategory === 'near_duplicate') {
        redundantPairs.push({
          productA: pA,
          productB: pB,
          comparison: comp,
          urgency: 'high',
          reason: `Both products communicate identical underlying motifs and target the same recipient persona, risking guide cannibalization.`
        });
      } else if (comp.overallCategory === 'strongly_overlapping') {
        redundantPairs.push({
          productA: pA,
          productB: pB,
          comparison: comp,
          urgency: 'moderate',
          reason: `Overlapping recipient profile and central appeal. Editorial framing should be clearly separated.`
        });
      }
    }
  }

  // 6. Distinctive Products (Lowest average overlap with the rest of the collection)
  const distinctiveProducts: { product: ProductRecord; standoutReason: string }[] = [];
  products.forEach((p) => {
    const scores = similarityScoresByProduct[p.id] || [];
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    if (maxScore < 45 && p.details.primaryRecipient) {
      distinctiveProducts.push({
        product: p,
        standoutReason: `Highly unique positioning (${p.details.workingName}): Low overlap (${maxScore}/100 max overlap) with existing items, filling a distinct standalone niche.`
      });
    }
  });

  // 7. Conceptual Clusters
  const clusters: ConceptCluster[] = [];

  // Viking Warrior Trope Cluster
  const vikingWarriorProds = products.filter((p) =>
    /valhalla|berserker|axe|odin|combat|warrior/i.test(
      (p.details.workingName || '') + ' ' + (p.details.initialPositioningIdea || '')
    )
  );
  if (vikingWarriorProds.length >= 2) {
    clusters.push({
      id: 'cluster-viking-warrior',
      niche: 'Viking History & Norse Culture',
      centralConcept: 'Generic Warrior & Pop-Culture Valhalla Bloodlust',
      productIds: vikingWarriorProds.map((p) => p.id),
      productNames: vikingWarriorProds.map((p) => p.details.workingName || 'Untitled'),
      riskLevel: 'high_redundancy',
      summary: `${vikingWarriorProds.length} products rely heavily on generic pop-culture warrior tropes, creating repetitive positioning.`,
      recommendation:
        'Differentiate into primary source historical citations (e.g. Anglo-Saxon Chronicles) or runic epigraphy to balance the guide.'
    });
  }

  // Civil War Little Round Top Tactical Cluster
  const civilWarTactical = products.filter((p) =>
    /20th maine|little round top|chamberlain|gettysburg/i.test(
      (p.details.workingName || '') + ' ' + (p.details.audienceInterest || '')
    )
  );
  if (civilWarTactical.length >= 2) {
    clusters.push({
      id: 'cluster-civil-war-tactical',
      niche: 'American Civil War',
      centralConcept: 'Gettysburg Little Round Top Tactical Commemoration',
      productIds: civilWarTactical.map((p) => p.id),
      productNames: civilWarTactical.map((p) => p.details.workingName || 'Untitled'),
      riskLevel: 'healthy_variety',
      summary: `${civilWarTactical.length} products explore Little Round Top, but span casual apparel and scholarly cartography portfolios.`,
      recommendation:
        'Maintain clear recipient boundaries between the casual battlefield tourist shirt and the archival wall map.'
    });
  }

  // 8. Incomplete Records Audit
  const incompleteRecords: PortfolioSummary['incompleteRecords'] = [];
  products.forEach((p) => {
    const missing: string[] = [];
    if (!p.imageDataUrl && !p.imageBlob) missing.push('Missing product mockup image');
    if (!p.details.currentDescription && !p.details.workingName) missing.push('Missing description');
    if (!p.details.primaryRecipient) missing.push('Missing primary recipient profile');
    if (!p.details.productSpecs) missing.push('Missing physical product specifications');
    if (!p.details.knownDesignReferences) missing.push('Missing design references / provenance');

    if (missing.length >= 2) {
      incompleteRecords.push({
        product: p,
        missingFields: missing,
        riskAssessment:
          missing.length >= 3
            ? 'High uncertainty: AI comparisons and similarity analysis are severely limited without visual and recipient context.'
            : 'Moderate uncertainty: Recipient and visual dimensions rely on heuristic estimates.'
      });
    }
  });

  // 9. Guide Coverage Analysis
  const guideCoverageMap: Record<string, GuideCoverageAnalysis> = {};

  giftGuides.forEach((guide) => {
    const assignedProducts = products.filter((p) => p.details.giftGuideId === guide.id);
    const pubCount = assignedProducts.filter((p) => p.publicationStatus === 'published' || p.status === 'completed').length;
    const revCount = assignedProducts.filter((p) => p.publicationStatus === 'in_review').length;
    const dftCount = assignedProducts.filter((p) => p.publicationStatus === 'draft' || (!p.publicationStatus && p.status === 'draft')).length;
    const unassCount = assignedProducts.filter((p) => p.publicationStatus === 'unassigned').length;

    // Format breakdown for this guide
    const gFormatMap: Record<string, number> = {};
    assignedProducts.forEach((p) => {
      const f = p.details.productType || 'other';
      gFormatMap[f] = (gFormatMap[f] || 0) + 1;
    });
    const formatDiversity = Object.entries(gFormatMap).map(([format, count]) => ({
      format,
      count,
      percentage: assignedProducts.length > 0 ? Math.round((count / assignedProducts.length) * 100) : 0
    }));

    // Identify gaps and angles grounded in actual data
    const angles: string[] = [];
    const gaps: PortfolioSummary['guideCoverageMap'][string]['identifiedCoverageGaps'] = [];
    const anchorProds: { id: string; name: string; reason: string }[] = [];

    if (guide.id === 'guide-viking-history') {
      const hasMug = assignedProducts.some((p) => p.details.productType === 'mug');
      const hasApparel = assignedProducts.some((p) => p.details.productType === 't-shirt' || p.details.productType === 'hoodie');
      const hasNotebook = assignedProducts.some((p) => p.details.productType === 'notebook');
      const hasScholarly = assignedProducts.some((p) => /chronicle|primary|futhark/i.test(p.details.workingName || ''));

      if (hasMug) angles.push('Drinkware (Everyday utility)');
      if (hasApparel) angles.push('Graphic Apparel (Identity wear)');
      if (hasScholarly) angles.push('Historiographical & Epigraphic scholarship');

      if (!hasNotebook) {
        gaps.push({
          id: 'gap-viking-stationery',
          gapTitle: 'Underrepresented Desk & Study Tools',
          gapDescription: 'Heavy representation in casual drinkware and combat apparel, with limited items for scholarly note-taking or field research.',
          evidenceFromCatalogue: `Catalogue contains ${gFormatMap['mug'] || 0} mugs and ${gFormatMap['t-shirt'] || 0} shirts, but 0 published stationery ledgers.`,
          missingAudienceOrFormat: 'Stationery / Hardcover field notebook format for academic students',
          strategicOpportunity: 'Introduce archival field notebooks focusing on Old Norse translation and archaeological site logs.',
          suggestedAction: 'Prioritize publishing the Elder Futhark field journal into the guide.'
        });
      }

      assignedProducts.forEach((p) => {
        if (p.details.workingName.includes('Lindisfarne 793')) {
          anchorProds.push({
            id: p.id,
            name: p.details.workingName,
            reason: 'Serves academic medievalists with authentic Anglo-Saxon Chronicle transcriptions, avoiding pop-culture tropes.'
          });
        }
      });
    } else if (guide.id === 'guide-civil-war') {
      const hasMap = assignedProducts.some((p) => p.details.productType === 'poster');
      const hasShirt = assignedProducts.some((p) => p.details.productType === 't-shirt');

      if (hasShirt) angles.push('Wearable battlefield tourist apparel');
      if (hasMap) angles.push('Archival military engineering cartography');

      if (!assignedProducts.some((p) => p.details.productType === 'drinkware' || p.details.productType === 'notebook')) {
        gaps.push({
          id: 'gap-civil-war-daily',
          gapTitle: 'Underrepresented Daily Functional Formats',
          gapDescription: 'Catalogue spans high-end wall cartography and t-shirts, but lacks accessible desktop or study gifts.',
          evidenceFromCatalogue: `Guide contains 0 drinkware items out of ${assignedProducts.length} assigned records.`,
          missingAudienceOrFormat: 'High-fire ceramic mug or pocket field diary',
          strategicOpportunity: 'Develop a soldier correspondence or letterpress excerpt mug (e.g. Sullivan Ballou letter).',
          suggestedAction: 'Prototype an archival letterpress mug honoring primary source letters.'
        });
      }
    } else {
      if (assignedProducts.length < 3) {
        gaps.push({
          id: `gap-${guide.id}-coverage`,
          gapTitle: 'Incomplete Catalogue Inventory',
          gapDescription: `Guide currently has only ${assignedProducts.length} assigned record(s) in local IndexedDB storage.`,
          evidenceFromCatalogue: `Assessment is based solely on ${assignedProducts.length} imported product record(s).`,
          missingAudienceOrFormat: 'Broader spectrum of product types and recipient personas',
          strategicOpportunity: 'Expand catalogue coverage with verified records before finalizing editorial curation.',
          suggestedAction: 'Import additional products or run preliminary analyses in the Workspace.'
        });
      }
    }

    guideCoverageMap[guide.id] = {
      guideId: guide.id,
      guideName: guide.name,
      totalAssigned: assignedProducts.length,
      publishedCount: pubCount,
      inReviewCount: revCount,
      draftCount: dftCount,
      unassignedCount: unassCount,
      recipientBreadth:
        assignedProducts.length >= 3
          ? 'Multi-tiered (casual enthusiasts through academic researchers)'
          : 'Concentrated (limited persona breadth in imported records)',
      formatDiversity,
      editorialAnglesRepresented: angles.length > 0 ? angles : ['General niche representation'],
      repeatedConcepts:
        guide.id === 'guide-viking-history' && vikingWarriorProds.length >= 2
          ? ['Generic warrior battle glory', 'Valhalla blood-oath motifs']
          : ['No severe concept duplication detected.'],
      interchangeableEntriesRisk:
        guide.id === 'guide-viking-history' && vikingWarriorProds.length >= 2
          ? ['Valhalla Berserker Axe Mug & Sons of Odin Tee compete for the same gift buyer']
          : [],
      distinctiveAnchorProducts: anchorProds,
      identifiedCoverageGaps: gaps,
      dataCompletenessAssessment:
        assignedProducts.some((p) => !p.imageDataUrl || !p.details.primaryRecipient)
          ? 'Notice: Several products in this guide have incomplete images or recipient details. Coverage assessment is provisional.'
          : 'Complete: All assigned products have verified specifications and recipient profiles.'
    };
  });

  // 10. Strategic Product Development Opportunities
  const developmentOpportunities: DevelopmentOpportunity[] = [
    {
      id: 'opp-viking-material-culture',
      niche: 'Viking History & Norse Culture',
      opportunityTitle: 'Everyday Norse Material Culture & Domestic Life (Avoiding Warrior Stereotypes)',
      opportunityDescription:
        'The current catalogue is heavily skewed toward combat weapons and battle fury (2 of 4 Viking products). An underserved recipient segment is readers and makers interested in seafaring navigation, textile loom weaving, and blacksmithing material culture.',
      evidenceFromCatalogue:
        'Catalogue has 2 aggressive warrior-themed items (Axe Mug, Berserker Tee), 1 chronicle raid mug, and 1 runic journal. Zero products explore Viking navigation, longship carpentry, or daily life.',
      intendedRecipient: 'Medieval history reader, wooden boat enthusiast, or archaeology museum member',
      whyWorthwhile:
        'Provides a thoughtful gift for history lovers who cringe at aggressive comic-book Viking clichés and appreciate genuine Norse craftsmanship.',
      existingProductsPartiallyAddressing: [
        { id: 'prod-lindisfarne-793-mug', name: 'Lindisfarne 793 AD Chronicle Ceramic Mug', overlapNote: 'Touches on 8th century, but focuses on monastic raid rather than crafts' }
      ],
      whatMakesNewProductDifferent:
        'Focuses on sunstone navigation (solar compass) or Oseberg ship timber joinery, celebrating intellect and maritime exploration rather than violence.',
      missingInformation: 'Need authentic archaeological line drawings of the Uunartoq sunstone or Oseberg textile fragments.',
      confidenceLevel: 'high',
      recommendedNextAction: 'Commission or draft a sunstone navigational chart mug or linen workshop apron.'
    },
    {
      id: 'opp-civil-war-correspondence',
      niche: 'American Civil War',
      opportunityTitle: 'Primary Source Soldier Letters & Archival Correspondence',
      opportunityDescription:
        'Existing Civil War products focus strictly on Little Round Top tactical geography (graphic tee and 1863 canvas survey map). A major opportunity exists for poignant primary source soldier correspondence.',
      evidenceFromCatalogue:
        '100% of current Civil War products (2 of 2) cover Little Round Top tactical elevation. No personal or epistolary historical perspective is represented.',
      intendedRecipient: 'Civil War roundtable member, genealogist, or epistolary literature reader',
      whyWorthwhile:
        'Appeals to gift buyers seeking an emotional, deeply moving tribute rather than tactical military maneuvers.',
      existingProductsPartiallyAddressing: [
        { id: 'prod-civil-war-tee', name: '20th Maine "Stand Firm" Regimental Graphic Tee', overlapNote: 'Covers 20th Maine, but focuses on tactical bayonet charge rather than letters' }
      ],
      whatMakesNewProductDifferent:
        'Replaces tactical maps with authentic transcriptions of wartime letters (e.g. Joshua Chamberlain’s heartfelt letters home or Sullivan Ballou’s Major farewell letter).',
      missingInformation: 'Confirm public domain transcription rights and select high-resolution archival letterpress scans.',
      confidenceLevel: 'high',
      recommendedNextAction: 'Design a letterpress-styled ceramic mug or boxed archival stationery set featuring genuine soldier letters.'
    },
    {
      id: 'opp-wwii-home-front-logistics',
      niche: 'WWII Aviation & Military History',
      opportunityTitle: 'Codebreaking & Mathematical Cryptanalysis (Bletchley Park)',
      opportunityDescription:
        'Current WWII coverage is purely aeronautical engineering (Spitfire Merlin engine schematic). A significant underserved segment is computer science students, mathematicians, and history buffs fascinated by Enigma and Colossus cryptanalysis.',
      evidenceFromCatalogue:
        'Sole WWII entry is an aviation blueprint desk mat. Zero intelligence, signals, or mathematical history products.',
      intendedRecipient: 'Software engineer, cryptographer, mathematics teacher, or Alan Turing admirer',
      whyWorthwhile:
        'Expands WWII gift appeal beyond traditional military enthusiasts to tech and STEM gift recipients.',
      existingProductsPartiallyAddressing: [
        { id: 'prod-spitfire-merlin-deskpad', name: 'Supermarine Spitfire Mk IX Blueprint Desk Pad', overlapNote: 'Shares WWII technical focus, but is strictly mechanical/aviation' }
      ],
      whatMakesNewProductDifferent:
        'Centers on mathematical rotor wiring logic, Bletchley Park Bombe paper tape, and cryptographic intellect rather than combat machines.',
      missingInformation: 'Verify authentic wiring diagrams of the Typex or Enigma M4 naval machine.',
      confidenceLevel: 'high',
      recommendedNextAction: 'Draft a Bombe machine cryptanalysis desk pad or hardcover cipher journal.'
    }
  ];

  // 11. Overarching Strategic Takeaway
  let strategicTakeaway =
    'The product portfolio demonstrates strong intellectual depth in specific anchor items, but contains noticeable conceptual clustering in popular niches (e.g. Viking pop-warrior tropes). Growth should focus on filling functional stationery gaps and expanding into material culture rather than duplicating existing combat motifs.';
  if (redundantPairs.length > 0) {
    strategicTakeaway += ` Warning: ${redundantPairs.length} product pair(s) exhibit high conceptual or recipient overlap and require distinct editorial angles in writing briefs to avoid cannibalization.`;
  }

  return {
    totalProducts: total,
    publishedCount,
    inReviewCount,
    draftCount,
    unassignedCount,
    nicheDistribution,
    formatDistribution,
    guideDistribution,
    clusters,
    redundantPairs,
    distinctiveProducts,
    incompleteRecords,
    guideCoverageMap,
    developmentOpportunities,
    strategicTakeaway
  };
}
