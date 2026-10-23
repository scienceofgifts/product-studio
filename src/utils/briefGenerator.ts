/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkflowState } from '../types/workflow';
import { DEFAULT_EDITORIAL_RULES } from '../data/defaultEditorialRules';
import { validateAndBuildVerifiedSpecsList } from '../services/productFactsService';

/**
 * Synthesizes a focused Editorial Brief from the 6-step workflow state.
 * Contains product identity, verified specifications, recipient profile, creative direction,
 * and copy parameters. Does NOT duplicate global editorial rules.
 */
export function synthesizeEditorialBrief(
  state: WorkflowState,
  _editorialRules?: string | null
): string {
  const { details, analysisResult, editorialSelections, copyConfig, images } = state;

  const workingName = editorialSelections.selectedTitle || details.workingName || 'Curated Product Gift';
  const productType = details.productType || 'gift item';
  const guideName = details.giftGuideName || 'Science of Gifts Editorial Guide';

  // 1. Facts & Specifications (Verified & Product-Type Validated)
  const { verifiedSpecs: specsList, movedToUncertainties } = validateAndBuildVerifiedSpecsList({
    productType: details.productType,
    productSpecs: details.productSpecs,
    extractedFacts: details.extractedFacts,
    confirmedSpecifications: analysisResult?.writingBrief?.confirmedSpecifications,
    undeterminedInformation: analysisResult?.visualConceptual?.undeterminedInformation,
    potentialAmbiguities: analysisResult?.visualConceptual?.potentialAmbiguities,
    missingInformation: analysisResult?.writingBrief?.missingInformationDoNotInvent
  });

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
    analysisResult.visualConceptual.undeterminedInformation.forEach((u) => {
      if (u && !uncertainties.includes(u)) uncertainties.push(u);
    });
  }
  if (analysisResult?.visualConceptual?.potentialAmbiguities) {
    analysisResult.visualConceptual.potentialAmbiguities.forEach((a) => {
      if (a && !uncertainties.includes(a)) uncertainties.push(a);
    });
  }
  if (analysisResult?.writingBrief?.missingInformationDoNotInvent) {
    analysisResult.writingBrief.missingInformationDoNotInvent.forEach((m) => {
      if (m && !uncertainties.includes(m)) uncertainties.push(m);
    });
  }
  if (analysisResult?.writingBrief?.claimsAndAssumptionsToAvoid) {
    analysisResult.writingBrief.claimsAndAssumptionsToAvoid.forEach((c) => {
      if (c && !uncertainties.includes(c)) uncertainties.push(c);
    });
  }
  for (const moved of movedToUncertainties) {
    if (moved && !uncertainties.includes(moved)) {
      uncertainties.push(moved);
    }
  }

  // If apparel product is missing verified fabric composition / GSM weight, explicitly guard against invention
  const normType = (details.productType || '').toLowerCase();
  if (normType === 'hoodie' || normType === 't-shirt' || normType === 'sweatshirt') {
    const hasVerifiedFabric = specsList.some((s) => /\b(cotton|fleece|polyester|blend|material|fabric)\b/i.test(s));
    const hasVerifiedWeight = specsList.some((s) => /\b(gsm|oz\s+fabric|fabric\s+weight)\b/i.test(s));
    if (!hasVerifiedFabric && !uncertainties.some((u) => /\b(fabric|blend|composition)\b/i.test(u))) {
      uncertainties.push('Exact fabric blend / material composition is not verified in the product record; do not invent cotton/polyester percentages.');
    }
    if (!hasVerifiedWeight && !uncertainties.some((u) => /\b(gsm|weight)\b/i.test(u))) {
      uncertainties.push('Exact fabric weight (GSM / oz) is not verified in the product record; do not invent fleece or garment weight.');
    }
  }

  // 6. Formatting style & length
  let lengthDesc = '180–240 words';
  if (copyConfig.targetLength === 'short') lengthDesc = '100–150 words';
  if (copyConfig.targetLength === 'long') lengthDesc = '300–450 words';
  if (copyConfig.targetLength === 'custom' && copyConfig.customWordCount) {
    lengthDesc = `${copyConfig.customWordCount} words (±10% range: ${Math.round(copyConfig.customWordCount * 0.9)}–${Math.round(copyConfig.customWordCount * 1.1)} words)`;
  }

  const restrictionsFormatted = [
    ...copyConfig.requiredInfoAndRestrictions,
    ...(copyConfig.customRestrictions ? [copyConfig.customRestrictions] : [])
  ].map((r) => `  - ${r}`).join('\n');

  return `# EDITORIAL WRITING BRIEF: ${workingName}
**Science of Gifts — Editorial Intelligence Studio**
*Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*

*(Note: Strategic rationale and recipient background below are provided as contextual guidance to help you understand the product. Communicate the useful result of this context in natural copy without reproducing analytical frameworks or copying strategic jargon.)*

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
- **Core Role in Guide:** Distinctive gift recommendation tailored to the recipient's specific passion.

### 3. CREATIVE DIRECTION & DESIGN CONTEXT
- **Central Concept & Design Interpretation:**
${interpretations.length > 0 ? interpretations.map((i) => `  - ${i}`).join('\n') : '  - Thoughtful design rooted in specialized audience interest.'}
- **Creative Focus / Angle:**
${angles.length > 0 ? angles.map((a) => `  - ${a}`).join('\n') : '  - Specificity-led insider appreciation.'}
${details.knownDesignReferences ? `- **Design References:** ${details.knownDesignReferences}` : ''}

### 4. INTENDED RECIPIENT PROFILE
- **Target Recipient(s):**
${recipients.length > 0 ? recipients.map((r) => `  - ${r}`).join('\n') : '  - Dedicated enthusiasts and thoughtful recipients.'}
- **Knowledge Depth:** ${analysisResult?.recipientIntelligence?.knowledgeDepth || 'Enthusiast level; deeply appreciates authentic details.'}
${analysisResult?.recipientIntelligence?.audienceMismatches?.length ? `- **Who NOT to Buy This For:** ${analysisResult.recipientIntelligence.audienceMismatches.join('; ')}` : ''}

### 5. COPY SPECIFICATIONS & FORMAT
- **Writing Tone / Style:** ${copyConfig.writingStyle.toUpperCase()} ${copyConfig.customStyleDescription ? `(${copyConfig.customStyleDescription})` : ''}
- **Target Word Count Range:** ${lengthDesc}
- **Output Format:** ${copyConfig.outputFormat === 'prose' ? 'Flowing prose paragraphs' : 'Structured entry with subheadings'}
${copyConfig.seoKeywords ? `- **SEO Keywords:** ${copyConfig.seoKeywords}` : ''}

### 6. UNCERTAINTIES & UNVERIFIED CLAIMS — DO NOT INVENT
${restrictionsFormatted ? `- **Mandatory Restrictions:**\n${restrictionsFormatted}\n` : ''}${uncertainties.length > 0 ? uncertainties.map((u) => `  - ⚠️ ${u}`).join('\n') : '  - ⚠️ Do not invent unverified materials, features, historical lore, or provenance.'}
${copyConfig.customInstructions ? `\n### 7. ADDITIONAL CAMPAIGN INSTRUCTIONS\n${copyConfig.customInstructions}` : ''}`;
}

/**
 * Formats a prompt tailored specifically for ChatGPT (GPT-4o / GPT-4.5) with a clear 3-layer architecture.
 */
export function formatPromptForChatGPT(briefMarkdown: string, editorialRules?: string | null): string {
  const activeRules = (editorialRules && editorialRules.trim()) ? editorialRules.trim() : DEFAULT_EDITORIAL_RULES;

  return `You write product entries for Science of Gifts, a gift-guide website that helps people choose thoughtful gifts for recipients with specific interests.

Write a finished, publication-ready gift-guide product entry based on the Global Editorial Rules and Editorial Brief below.

=========================================
LAYER 1: GLOBAL EDITORIAL RULES
=========================================
${activeRules}

=========================================
LAYER 2: PRODUCT-SPECIFIC EDITORIAL BRIEF
=========================================
${briefMarkdown}

=========================================
LAYER 3: OUTPUT REQUIREMENTS & TASK INSTRUCTIONS
=========================================
1. PRECEDENCE POLICY:
   - Verified physical facts have HIGHEST PRECEDENCE. Never contradict verified specifications.
   - Global Editorial Rules govern voice, tone, style, and prohibitions.
   - The Editorial Brief dictates product identity, recipient context, and word count.

2. WRITING & STRUCTURE INSTRUCTIONS:
   - Open directly with a concrete design detail, recognizable experience, or inside joke relevant to the recipient.
   - Write in flowing prose paragraphs unless subheadings are explicitly requested.
   - Treat opening details, design appeal, and recipient fit as a natural flow rather than separate rigid essay paragraphs.
   - Aim for the target word count range naturally without repeating ideas, inventing additional interpretations, or adding filler to reach the upper limit.
   - Communicate the useful result of the analysis without explaining the underlying thought process or strategic reasoning.

3. STRICT NEGATIVE CONSTRAINTS:
   - Absolutely DO NOT use em-dashes ("—"). Use commas, periods, or parentheses instead.
   - Absolutely DO NOT invent physical specifications, material composition, prices, or provenance beyond what is explicitly provided.
   - Return ONLY the finished product copy. Do not include introductory pleasantries, self-evaluations, or metadata commentary.
`;
}

/**
 * Formats a prompt tailored specifically for Claude (Claude 3.7 Sonnet / Opus) using structured XML tags.
 */
export function formatPromptForClaude(briefMarkdown: string, editorialRules?: string | null): string {
  const activeRules = (editorialRules && editorialRules.trim()) ? editorialRules.trim() : DEFAULT_EDITORIAL_RULES;

  return `You write product entries for Science of Gifts, a gift-guide website that helps people choose thoughtful gifts for recipients with specific interests.

Your assignment is to write a finished, publication-ready editorial product entry following the Global Editorial Rules and Product Brief below.

<precedence_policy>
1. Verified physical product facts strictly override creative interpretations.
2. Global editorial rules govern voice, tone, grounded style, and prohibitions.
3. Product-specific brief configurations dictate the context and target length.
</precedence_policy>

<global_editorial_rules>
${activeRules}
</global_editorial_rules>

<editorial_brief>
${briefMarkdown}
</editorial_brief>

<output_requirements>
1. Word Count & Length: Aim for the target word count range without repeating ideas, adding filler, or forcing additional paragraphs. Stop naturally when the thought is complete.
2. Prose Structure: Use flowing prose paragraphs unless subheadings are explicitly requested. Do not force separate paragraphs for every analytical category.
3. Grounded Voice: Write like a knowledgeable person explaining an interesting gift to someone who understands the subject. Use natural, everyday English.
4. Em-Dash Ban: Absolutely DO NOT use any em-dashes ("—"). Use commas, periods, or parentheses instead.
5. Factual Integrity: Introduce only verified facts confirmed in the brief. Do not speculate or invent unverified product features or claims.
6. Clean Output: Return ONLY the finished product copy. Do not wrap in introductory pleasantries, markdown commentary, or concluding notes.
</output_requirements>

Write the finished product copy now:`;
}
