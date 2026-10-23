/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductRecord, GiftGuide } from '../types';
import {
  GuidePlanRecord,
  GuideAnalysisResult,
  GuideOutline,
  GuideOutlineSection,
  GeneratedPromptRecord,
  RedundancyFinding,
  RecipientCoverageItem,
  AngleDiversityItem,
  FormatDiversityItem,
  UncertaintyItem,
  ActionableRecommendation,
  GuideLineupItem
} from '../types/planner';
import { WritingGuidelinesSettings, ApprovedWritingExample } from '../types/writingGuidelines';
import { INITIAL_WRITING_GUIDELINES } from '../data/initialWritingGuidelines';
import { composePromptWithGuidelines } from './promptComposer';

/**
 * Perform Whole-Guide Editorial Analysis
 */
export function analyzeGuideCollection(
  plan: GuidePlanRecord,
  catalogueProducts: ProductRecord[],
  giftGuides: GiftGuide[]
): GuideAnalysisResult {
  const lineupItems = plan.lineup;
  const productMap = new Map<string, ProductRecord>();
  catalogueProducts.forEach((p) => productMap.set(p.id, p));

  const redundancyFindings: RedundancyFinding[] = [];
  const uncertainties: UncertaintyItem[] = [];
  const formatCounts: Record<string, number> = {};
  const angleMap: Record<string, string[]> = {};

  const resolvedProducts: { item: GuideLineupItem; product?: ProductRecord }[] = lineupItems.map((item) => {
    const prod = productMap.get(item.productId);
    const format = prod?.details.productType || item.customFormat || 'mug';
    formatCounts[format] = (formatCounts[format] || 0) + 1;

    if (prod) {
      if (!prod.details.currentDescription && !prod.details.productSpecs) {
        uncertainties.push({
          productId: prod.id,
          productName: prod.details.workingName || 'Unnamed Product',
          issue: 'Missing product description and specifications in catalogue.'
        });
      }
      if (!prod.imageBlob && !prod.imageDataUrl) {
        uncertainties.push({
          productId: prod.id,
          productName: prod.details.workingName || 'Unnamed Product',
          issue: 'No visual mockup image attached to catalogue record.'
        });
      }
    } else if (item.isGuideOnly) {
      if (!item.customDescription) {
        uncertainties.push({
          productId: item.id,
          productName: item.customTitle || 'Guide-Only Entry',
          issue: 'Guide-only entry lacks detailed description or verification.'
        });
      }
    }

    return { item, product: prod };
  });

  for (let i = 0; i < resolvedProducts.length; i++) {
    for (let j = i + 1; j < resolvedProducts.length; j++) {
      const a = resolvedProducts[i];
      const b = resolvedProducts[j];
      const nameA = a.product?.details.workingName || a.item.customTitle || 'Product A';
      const nameB = b.product?.details.workingName || b.item.customTitle || 'Product B';
      const formatA = a.product?.details.productType || a.item.customFormat;
      const formatB = b.product?.details.productType || b.item.customFormat;

      if (formatA === formatB && formatA) {
        const wordsA = new Set(nameA.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
        const wordsB = new Set(nameB.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
        let common = 0;
        wordsA.forEach(w => { if (wordsB.has(w)) common++; });

        if (common >= 2) {
          redundancyFindings.push({
            issue: `Potential conceptual or format redundancy between "${nameA}" and "${nameB}".`,
            productIds: [a.item.productId, b.item.productId],
            evidence: `Both use format "${formatA}" and share key terminology (${common} overlapping terms).`,
            recommendation: 'Ensure each entry serves a distinct sub-recipient or offers a radically different intellectual angle.'
          });
        }
      }
    }
  }

  const formatDiversity: FormatDiversityItem[] = Object.entries(formatCounts).map(([format, count]) => ({
    format,
    count
  }));

  const intendedRecipients = plan.brief.intendedRecipients || ['General Enthusiast'];
  const recipientCoverage: RecipientCoverageItem[] = intendedRecipients.map((subgroup) => {
    const matches = resolvedProducts.some((r) => {
      const rec = r.product?.details.primaryRecipient || r.item.customRecipient || '';
      return rec.toLowerCase().includes(subgroup.toLowerCase()) || subgroup.toLowerCase().includes(rec.toLowerCase());
    });
    return {
      subgroup,
      covered: matches || resolvedProducts.length > 0,
      notes: matches ? `Addressed by selected lineup items.` : `Verify if specific lineup item caters directly to ${subgroup}.`
    };
  });

  resolvedProducts.forEach((r) => {
    const angle = r.item.editorialRole || r.product?.details.initialPositioningIdea || 'General Appeal';
    if (!angleMap[angle]) angleMap[angle] = [];
    angleMap[angle].push(r.product?.id || r.item.id);
  });

  const angleDiversity: AngleDiversityItem[] = Object.entries(angleMap).map(([angle, productIds]) => ({
    angle,
    productIds
  }));

  const actionableRecommendations: ActionableRecommendation[] = [];
  if (redundancyFindings.length > 0) {
    actionableRecommendations.push({
      severity: 'warning',
      issue: 'Potential product redundancy detected in lineup.',
      evidence: `${redundancyFindings.length} pairs share identical format and overlapping motifs.`,
      readerImportance: 'Readers may feel repetitive descriptions diminish guide quality.',
      suggestedAction: 'Review differentiation notes for flagged items to emphasize distinct use cases.'
    });
  }

  if (uncertainties.length > 0) {
    actionableRecommendations.push({
      severity: 'warning',
      issue: `${uncertainties.length} product entries have incomplete data or missing images.`,
      evidence: 'Missing descriptions, specifications, or visual mockups.',
      readerImportance: 'Incomplete information leads to weaker buyer confidence.',
      suggestedAction: 'Complete product catalog details or add guide-specific descriptions.'
    });
  }

  return {
    timestamp: new Date().toISOString(),
    redundancyFindings,
    recipientCoverage,
    angleDiversity,
    formatDiversity,
    uncertainties,
    actionableRecommendations
  };
}

export function generateGuideOutline(plan: GuidePlanRecord, catalogueProducts: ProductRecord[]): GuideOutline {
  const productMap = new Map<string, ProductRecord>();
  catalogueProducts.forEach((p) => productMap.set(p.id, p));

  const sections: GuideOutlineSection[] = [
    {
      id: 'sec-intro',
      title: '1. Introduction',
      type: 'introduction',
      isApproved: false,
      needsRevision: false,
      content: `**Target Angle**: ${plan.brief.editorialAngle || 'Authentic historical and cultural appreciation'}\n\n- **Buyer Problem**: ${plan.brief.primaryReaderProblem || 'Finding a meaningful gift that avoids generic clichés.'}\n- **Guide Purpose**: ${plan.brief.guidePurpose || 'Curate a selective gift list.'}`
    },
    {
      id: 'sec-products',
      title: '2. Product Entries (Curated Lineup)',
      type: 'product_entries',
      isApproved: false,
      needsRevision: false,
      content: plan.lineup.map((item, idx) => {
        const prod = productMap.get(item.productId);
        const name = prod?.details.workingName || item.customTitle || `Product ${idx + 1}`;
        const format = prod?.details.productType || item.customFormat || 'Product';
        return `### ${idx + 1}. ${name} (${format})\n- **Role**: ${item.editorialRole}\n- **Differentiation**: ${item.differentiationNotes}`;
      }).join('\n\n')
    },
    {
      id: 'sec-buying-advice',
      title: '3. How to Pick the Right Gift',
      type: 'buying_advice',
      isApproved: false,
      needsRevision: false,
      content: `Tailored decision criteria for **${plan.brief.topicOrNiche}**:`
    },
    {
      id: 'sec-faq',
      title: '4. Frequently Asked Questions',
      type: 'faq',
      isApproved: false,
      needsRevision: false,
      content: `- **Q1: What makes a good gift for a ${plan.brief.targetBuyer}?**`
    },
    {
      id: 'sec-closing',
      title: '5. Closing & Next Steps',
      type: 'closing',
      isApproved: false,
      needsRevision: false,
      content: `Provide a thoughtful wrap-up encouraging final decision making.`
    }
  ];

  return {
    version: 1,
    lastModified: new Date().toISOString(),
    isApproved: false,
    sections
  };
}

/**
 * Generate Master ChatGPT Prompt composed with Persistent Writing Guidelines & Style Profiles
 */
export function generateChatGPTGuidePrompt(
  plan: GuidePlanRecord,
  catalogueProducts: ProductRecord[],
  editorialRules?: string,
  guidelines?: WritingGuidelinesSettings,
  examples?: ApprovedWritingExample[]
): GeneratedPromptRecord {
  const productMap = new Map<string, ProductRecord>();
  catalogueProducts.forEach((p) => productMap.set(p.id, p));

  const outlineText = plan.outline
    ? plan.outline.sections.map((s) => `### ${s.title}\n${s.content}`).join('\n\n')
    : 'No outline generated yet.';

  const lineupText = plan.lineup.map((item, idx) => {
    const prod = productMap.get(item.productId);
    const name = prod?.details.workingName || item.customTitle || `Product ${idx + 1}`;
    const format = prod?.details.productType || item.customFormat || 'Product';
    const description = prod?.details.currentDescription || prod?.details.productSpecs || item.customDescription || 'No detailed description provided yet.';
    const recipient = prod?.details.primaryRecipient || item.customRecipient || plan.brief.targetBuyer;
    const positioning = prod?.details.initialPositioningIdea || 'Standard curated entry';

    return `### Product ${idx + 1}: ${name} (${format}) [Planned Entry]
- **Target Recipient**: ${recipient}
- **Editorial Role**: ${item.editorialRole}
- **Differentiation Notes**: ${item.differentiationNotes}
- **Product Details & Specifications**: ${description}
- **Analysis / Positioning**: ${positioning}`;
  }).join('\n\n');

  const internalLinksText = plan.internalLinks && plan.internalLinks.length > 0
    ? plan.internalLinks.map((l) => `- [${l.anchorText}] (Topic: ${l.title}) — Relevance: ${l.relevance}`).join('\n')
    : 'None specified.';

  const taskInstructions = `*** CRITICAL INSTRUCTION: DO NOT WRITE THE COMPLETE GUIDE WHEN THIS PROMPT IS RECEIVED. ***

Instead, follow this workflow:
1. Read and internalize the complete guide brief, product lineup, outline, and editorial constraints below.
2. Acknowledge the plan briefly in 1-2 sentences and confirm that you understand the intended workflow.
3. Wait for the user to supply the first product image and shop link, or to give another explicit instruction.
4. When a product image and link are supplied, write ONLY the requested product entry unless the user explicitly asks for something else.
5. Use the complete planned lineup as background context to distinguish the current product from other entries and avoid repetitive descriptions.
6. Do NOT write entries for products whose images and supporting details have not yet been supplied, unless the user explicitly requests otherwise.
7. Do NOT automatically write the introduction, buying advice, FAQ, or closing sections. Wait for the user's explicit instructions before drafting them.

---

## 1. Guide Identity & Purpose
- **Working Title**: ${plan.brief.workingTitle || plan.title}
- **Topic / Niche**: ${plan.brief.topicOrNiche}
- **Target Buyer**: ${plan.brief.targetBuyer}
- **Intended Recipients**: ${(plan.brief.intendedRecipients || []).join(', ')}
- **Occasion**: ${plan.brief.occasion || 'General gifting'}
- **Primary Reader Problem**: ${plan.brief.primaryReaderProblem}
- **Guide Purpose & Intent**: ${plan.brief.guidePurpose}
- **Editorial Angle**: ${plan.brief.editorialAngle}
- **Preferred Tone & Style**: ${plan.brief.preferredTone || 'Knowledgeable, engaging, respectful, and discerning'}
- **Subject-Matter Depth**: ${plan.brief.subjectDepth || 'Moderate to high scholarly/cultural accuracy'}
- **Length Guidance**: ${plan.brief.lengthGuidance || 'Standard comprehensive guide (~1,200 - 2,000 words)'}
- **Editorial Notes / Constraints**: ${plan.brief.editorialNotes || 'None'}

## 2. Approved Outline & Section Structure
${outlineText}

## 3. Planned Product Lineup (${plan.lineup.length} Products)
${lineupText}

## 4. Internal Links
${internalLinksText}`;

  const guideOverrides = plan.brief.editorialNotes || '';

  const promptText = composePromptWithGuidelines({
    editorialRules,
    guidelines,
    contentType: 'introduction',
    guideOverrides,
    taskInstructions,
    productOrGuideContext: `Guide: ${plan.title} (${plan.brief.topicOrNiche})`,
    examples: examples || []
  });

  return {
    version: (plan.generatedPrompt?.version || 0) + 1,
    timestamp: new Date().toISOString(),
    promptText
  };
}
