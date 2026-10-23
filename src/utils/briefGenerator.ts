/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkflowState } from '../types/workflow';
import { DEFAULT_EDITORIAL_RULES } from '../data/defaultEditorialRules';

/**
 * Synthesizes a comprehensive, authoritative Editorial Brief from the 6-step workflow state,
 * incorporating the single global Editorial Rules with strict precedence:
 * Verified Product Facts > Global Editorial Rules > Product-Specific Choices.
 */
export function synthesizeEditorialBrief(
  state: WorkflowState,
  editorialRules?: string | null
): string {
  const { details, analysisResult, editorialSelections, copyConfig, images } = state;

  const workingName = editorialSelections.selectedTitle || details.workingName || 'Curated Product Gift';
  const productType = details.productType || 'gift item';
  const guideName = details.giftGuideName || 'Science of Gifts Editorial Guide';

  // 1. Facts & Specifications (Verified)
  const specsList: string[] = [];
  if (details.productSpecs) {
    specsList.push(details.productSpecs);
  }
  if (details.extractedFacts) {
    if (details.extractedFacts.fabricComposition?.value) {
      specsList.push(`Material / Fabric: ${details.extractedFacts.fabricComposition.value}`);
    }
    if (details.extractedFacts.fabricWeight?.value) {
      specsList.push(`Fabric Weight: ${details.extractedFacts.fabricWeight.value}`);
    }
    if (details.extractedFacts.fit?.value) {
      specsList.push(`Fit: ${details.extractedFacts.fit.value}`);
    }
    if (details.extractedFacts.price?.value) {
      specsList.push(`Price: ${details.extractedFacts.price.value}`);
    }
    if (details.extractedFacts.sizeRange?.value) {
      specsList.push(`Sizes: ${details.extractedFacts.sizeRange.value}`);
    }
  }
  if (analysisResult?.writingBrief?.confirmedSpecifications) {
    analysisResult.writingBrief.confirmedSpecifications.forEach((s) => {
      if (!specsList.includes(s)) specsList.push(s);
    });
  }

  // 2. Selected Design Interpretation
  const interpretations: string[] = [...editorialSelections.selectedInterpretations];
  if (editorialSelections.customInterpretation && editorialSelections.customInterpretation.trim()) {
    interpretations.push(editorialSelections.customInterpretation.trim());
  }
  if (interpretations.length === 0 && analysisResult?.productPositioning?.distinctiveEssence) {
    interpretations.push(analysisResult.productPositioning.distinctiveEssence);
  }

  // 3. Selected Creative Angles
  const angles: string[] = [...editorialSelections.selectedAngles];
  if (editorialSelections.customAngle && editorialSelections.customAngle.trim()) {
    angles.push(editorialSelections.customAngle.trim());
  }
  if (angles.length === 0 && analysisResult?.productPositioning?.positioningAngles?.[0]) {
    angles.push(analysisResult.productPositioning.positioningAngles[0].angleName);
  }

  // 4. Selected Recipients
  const recipients: string[] = [...editorialSelections.selectedRecipients];
  if (editorialSelections.customRecipient && editorialSelections.customRecipient.trim()) {
    recipients.push(editorialSelections.customRecipient.trim());
  }
  if (recipients.length === 0 && details.primaryRecipient) {
    recipients.push(details.primaryRecipient);
  }
  if (recipients.length === 0 && analysisResult?.recipientIntelligence?.primaryRecipientProfile) {
    recipients.push(analysisResult.recipientIntelligence.primaryRecipientProfile);
  }

  // 5. Uncertainties & Facts to avoid inventing
  const uncertainties: string[] = [];
  if (analysisResult?.visualConceptual?.undeterminedInformation) {
    uncertainties.push(...analysisResult.visualConceptual.undeterminedInformation);
  }
  if (analysisResult?.visualConceptual?.potentialAmbiguities) {
    uncertainties.push(...analysisResult.visualConceptual.potentialAmbiguities);
  }
  if (analysisResult?.writingBrief?.claimsAndAssumptionsToAvoid) {
    analysisResult.writingBrief.claimsAndAssumptionsToAvoid.forEach((c) => {
      if (!uncertainties.includes(c)) uncertainties.push(c);
    });
  }

  // 6. Formatting style & length
  let lengthDesc = '180–240 words (Standard Gift Guide Entry)';
  if (copyConfig.targetLength === 'short') lengthDesc = '100–150 words (Concise Entry)';
  if (copyConfig.targetLength === 'long') lengthDesc = '300–450 words (In-depth Feature Entry)';
  if (copyConfig.targetLength === 'custom' && copyConfig.customWordCount) {
    lengthDesc = `${copyConfig.customWordCount} words (±10% range: ${Math.round(copyConfig.customWordCount * 0.9)}–${Math.round(copyConfig.customWordCount * 1.1)} words)`;
  }

  const sectionsFormatted = copyConfig.selectedSections
    .map((s) => `  - ${s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`)
    .join('\n');

  const emphasisFormatted = copyConfig.contentEmphasis
    .map((e) => `  - ${e}`)
    .join('\n');

  const restrictionsFormatted = [
    ...copyConfig.requiredInfoAndRestrictions,
    ...(copyConfig.customRestrictions ? [copyConfig.customRestrictions] : [])
  ].map((r) => `  - ${r}`).join('\n');

  const activeRules = (editorialRules && editorialRules.trim()) ? editorialRules.trim() : DEFAULT_EDITORIAL_RULES;

  return `# EDITORIAL WRITING BRIEF: ${workingName}
**Science of Gifts — Editorial Intelligence Studio**
*Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*

---

### EDITORIAL PRECEDENCE POLICY
1. **Verified Physical Facts (Highest Precedence):** Physical specifications, fabrics, and dimensions below must never be contradicted or embellished.
2. **Global Editorial Rules:** Apply automatically to style, tone, em-dash prohibitions, and quality standards.
3. **Product-Specific Editorial Choices:** Specific interpretations, angles, word count, and sections chosen below direct this entry's creative focus.

---

### 1. PRODUCT IDENTITY & VERIFIED PHYSICAL FACTS
- **Working Title:** ${workingName}
- **Product Type:** ${productType}
- **Images Provided:** ${images.length > 0 ? `${images.length} mockup image(s) analyzed` : 'None uploaded'}
- **Product Page URL:** ${details.productUrl || 'None supplied'}
- **Verified Physical Specifications (DO NOT CONTRADICT OR INVENT):**
${specsList.length > 0 ? specsList.map((s) => `  - ${s}`).join('\n') : '  - None verified. Do NOT invent specifications.'}

### 2. EDITORIAL CONTEXT & PUBLICATION ROLE
- **Gift Guide:** ${guideName}
- **Audience / Niche:** ${details.audienceInterest || 'Passionate enthusiasts & cultural collectors'}
- **Occasion:** ${details.occasion || 'General gifting'}
- **Core Role in Guide:** Distinctive, high-integrity gift recommendation rejecting commercial gift clichés in favor of genuine craft and meaningful design.

### 3. SELECTED DESIGN INTERPRETATION & CREATIVE ANGLE
- **Distinctive Concept & Interpretation:**
${interpretations.length > 0 ? interpretations.map((i) => `  - ${i}`).join('\n') : '  - Thoughtful design rooted in specialized cultural literacy.'}
- **Approved Creative Angle(s):**
${angles.length > 0 ? angles.map((a) => `  - ${a}`).join('\n') : '  - Specificity-led insider appreciation.'}
${details.knownDesignReferences ? `- **Design References:** ${details.knownDesignReferences}` : ''}

### 4. INTENDED RECIPIENT PROFILE
- **Target Recipient(s):**
${recipients.length > 0 ? recipients.map((r) => `  - ${r}`).join('\n') : '  - Dedicated enthusiasts and thoughtful recipients.'}
- **Knowledge Depth:** ${analysisResult?.recipientIntelligence?.knowledgeDepth || 'Enthusiast level; deeply appreciates authentic details.'}
- **Gift Buyer's Motivation:** Demonstrate genuine understanding of the recipient's specific passion rather than settling for generic novelty items.
${analysisResult?.recipientIntelligence?.audienceMismatches?.length ? `- **Who NOT to Buy This For:** ${analysisResult.recipientIntelligence.audienceMismatches.join('; ')}` : ''}

### 5. COPY SPECIFICATIONS & STRUCTURE
- **Writing Style:** ${copyConfig.writingStyle.toUpperCase()} ${copyConfig.customStyleDescription ? `(${copyConfig.customStyleDescription})` : ''}
- **Target Word Count:** ${lengthDesc}
- **Output Format:** ${copyConfig.outputFormat === 'prose' ? 'Flowing prose paragraphs' : 'Structured multi-section entry with clear subheadings'}
- **Required Content Sections:**
${sectionsFormatted || '  - Flowing prose covering opening, design meaning, recipient fit, and verified details.'}
- **Priority Emphasis:**
${emphasisFormatted || '  - Design interpretation & recipient fit'}
${copyConfig.seoKeywords ? `- **SEO Search Intent Keywords:** ${copyConfig.seoKeywords}` : ''}

### 6. GLOBAL EDITORIAL RULES & GUARDRAILS
${activeRules}

### 7. PRODUCT-SPECIFIC GUARDRAILS & UNCERTAINTIES
- **Mandatory Product Restrictions:**
${restrictionsFormatted}
- **Uncertainties & Information Not Verified — DO NOT INVENT:**
${uncertainties.length > 0 ? uncertainties.map((u) => `  - ⚠️ ${u}`).join('\n') : '  - ⚠️ Do not invent unverified materials, features, or historical lore.'}
${copyConfig.customInstructions ? `\n### 8. OPTIONAL CAMPAIGN INSTRUCTIONS\n${copyConfig.customInstructions}` : ''}
`;
}

/**
 * Formats a prompt tailored specifically for ChatGPT (GPT-4o / GPT-4.5) using the single Editorial Rules.
 */
export function formatPromptForChatGPT(briefMarkdown: string, editorialRules?: string | null): string {
  const activeRules = (editorialRules && editorialRules.trim()) ? editorialRules.trim() : DEFAULT_EDITORIAL_RULES;

  return `You are the master editorial writer and copy chief for "Science of Gifts", an authoritative gift-guide publication.
Write a finished, publication-ready gift-guide product entry based strictly on the following Editorial Brief and Global Editorial Rules.

EDITORIAL PRECEDENCE POLICY:
1. Verified Physical Product Facts have HIGHEST PRECEDENCE. Never contradict verified specifications.
2. Global Editorial Rules govern voice, tone, formatting, and strict prohibitions.
3. Explicit choices in the Editorial Brief dictate the creative angle, target recipient, word count, and sections.

CRITICAL INSTRUCTIONS:
1. Adhere strictly to the target word count and output structure specified in the brief.
2. Open with a concrete, distinctive observation or interpretation of the product design. Never open with a generic question ("Looking for the perfect gift?") or promotional slogan.
3. Address the gift-buyer while respecting the recipient's knowledge depth.
4. Seamlessly integrate verified specifications as supporting evidence.
5. STRICT NEGATIVE CONSTRAINTS:
   - Absolutely DO NOT use em-dashes ("—"). Use commas, parentheses, or separate sentences instead.
   - Absolutely DO NOT invent physical specifications, material properties, or historical provenance beyond what is provided in the brief.
   - Do NOT include any self-evaluation, metadata, markdown commentary, or introductory greeting. Return ONLY the finished product copy.

=========================
GLOBAL EDITORIAL RULES
=========================
${activeRules}

=========================
EDITORIAL BRIEF
=========================
${briefMarkdown}
`;
}

/**
 * Formats a prompt tailored specifically for Claude (Claude 3.7 Sonnet / Opus) using structured XML tags.
 */
export function formatPromptForClaude(briefMarkdown: string, editorialRules?: string | null): string {
  const activeRules = (editorialRules && editorialRules.trim()) ? editorialRules.trim() : DEFAULT_EDITORIAL_RULES;

  return `You are the master editorial writer for Science of Gifts, an authoritative publication that curates products for passionate cultural, historical, and intellectual niches.

Your assignment is to write the final editorial product entry following the enclosed editorial brief with exacting fidelity.

<precedence_policy>
1. Verified physical product facts strictly override creative interpretations.
2. Global editorial rules apply across all entries.
3. Product-specific brief configurations dictate the focus and structure.
</precedence_policy>

<global_editorial_rules>
${activeRules}
</global_editorial_rules>

<editorial_brief>
${briefMarkdown}
</editorial_brief>

<constraints>
1. Word Count: Strictly obey the word count range declared in the brief.
2. Em-Dash Ban: You must NOT use any em-dashes ("—"). Use commas, periods, or parentheses instead.
3. Opening Rule: Open directly with the most distinctive, supportable observation about the product. Never use cliché openings such as "Looking for the perfect gift?" or "Whether you're shopping for...".
4. Factual Integrity: Introduce only the verified facts and specifications explicitly confirmed in the brief. Do not speculate or invent unverified product claims.
5. Audience Balance: Speak directly to the thoughtful gift-buyer while treating the recipient's niche interest with genuine respect and nuance.
6. Output Format: Return only the finished copy. Do not wrap in introductory pleasantries, explanations, or concluding analysis.
</constraints>

Write the finished product copy now:`;
}
