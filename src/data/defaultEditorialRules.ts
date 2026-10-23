/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusinessBrainData } from '../types';
import { WritingGuidelinesSettings } from '../types/writingGuidelines';

export const DEFAULT_EDITORIAL_RULES = `SCIENCE OF GIFTS — GLOBAL EDITORIAL RULES

1. CORE IDENTITY & POSITIONING
- Science of Gifts is an authoritative editorial gift-guide publication paired with a curated print-on-demand shop.
- We curate products for highly specific passions (e.g., Viking history, American Civil War, WWII aviation, classical literature, filmmaking, botany, astronomy).
- Write for the gift buyer while deeply respecting the recipient's knowledge depth.
- The gift buyer wants to express care, understanding, and thoughtfulness; the recipient values accuracy, nuance, and restraint.
- Explain why a product is appropriate for the recipient and how it differs from generic commodities.

2. VOICE & TONE
- Knowledgeable, discerning, intellectually curious, calm, and trustworthy.
- Speak directly to thoughtful gift-givers without patronizing them or resorting to breathless marketing hype.
- Avoid forced internet humor, exclamation marks, or hyperbolic praise.

3. STYLE & FORMATTING RULES
- Standard gift-guide product entry length: 180 to 240 words (target 210 words), typically structured in 2 to 3 paragraphs.
- Lead with a sharp, concrete observational hook or design interpretation specific to the product.
- Introduce verified specifications naturally as supporting evidence.
- Use italics for titles, publications, and specific manuscript names where appropriate.
- Avoid unnecessary bold formatting in finished gift-guide copy.

4. ABSOLUTE PROHIBITIONS & THINGS TO AVOID
- STRICT BAN: Absolutely DO NOT use em-dashes ("—"). Use commas, periods, or parentheses instead.
- NO generic openings ("Looking for the perfect gift?", "Searching for something special?", "Whether you're shopping for...").
- NO empty superlatives or promotional clichés ("stunning", "must-have", "ultimate gift for anyone", "guaranteed to impress", "look no further").
- NO repetitive product-entry structures or keyword stuffing.
- NEVER invent unverified specifications, materials, prices, availability, or historical claims.

5. FACTUAL & EDITORIAL GUARDRAILS (HIGHEST PRECEDENCE)
- Verified physical product facts (materials, dimensions, colors, verified specs) take absolute precedence over editorial styling.
- Clearly distinguish observations from inferences. If details are unverified or ambiguous, do not state them as fact.
- Distinguish archaeological and historical reality from popular folklore.`;

/**
 * Migration helper: Synthesizes a unified editorialRules string from legacy
 * Business Brain and Writing Guidelines settings if a user has existing custom data.
 */
export function synthesizeEditorialRulesFromLegacy(
  brain?: BusinessBrainData | null,
  guidelines?: WritingGuidelinesSettings | null
): string {
  const sections: string[] = ['SCIENCE OF GIFTS — GLOBAL EDITORIAL RULES\n'];

  // 1. Positioning
  if (brain?.businessPositioning) {
    sections.push(`### 1. CORE IDENTITY & POSITIONING\n${brain.businessPositioning.trim()}`);
  } else {
    sections.push(`### 1. CORE IDENTITY & POSITIONING\n- Science of Gifts is an authoritative gift-guide publication.\n- Help buyers find meaningful, intellectually resonant gifts for recipients with specific interests.`);
  }

  // 2. Voice & Tone
  if (guidelines?.voiceAndTone || brain?.editorialVoiceAndRules) {
    const vt = [guidelines?.voiceAndTone, brain?.editorialVoiceAndRules].filter(Boolean).join('\n');
    sections.push(`### 2. VOICE & TONE\n${vt.trim()}`);
  }

  // 3. Style & Formatting
  if (guidelines?.universalGuidelines || guidelines?.styleAndFormatting) {
    const sf = [guidelines?.universalGuidelines, guidelines?.styleAndFormatting].filter(Boolean).join('\n');
    sections.push(`### 3. STYLE & FORMATTING RULES\n${sf.trim()}`);
  }

  // 4. Prohibitions & Things to Avoid
  if (guidelines?.thingsToAvoid || brain?.prohibitedPatterns) {
    const avoid = [guidelines?.thingsToAvoid, brain?.prohibitedPatterns].filter(Boolean).join('\n');
    sections.push(`### 4. ABSOLUTE PROHIBITIONS & THINGS TO AVOID\n${avoid.trim()}`);
  }

  // 5. Guardrails
  if (guidelines?.factualAndEditorialGuardrails || brain?.historicalCulturalAccuracy) {
    const guards = [guidelines?.factualAndEditorialGuardrails, brain?.historicalCulturalAccuracy].filter(Boolean).join('\n');
    sections.push(`### 5. FACTUAL & EDITORIAL GUARDRAILS (HIGHEST PRECEDENCE)\n- Verified product facts always override editorial styling.\n${guards.trim()}`);
  }

  const combined = sections.join('\n\n').trim();
  return combined.length > 100 ? combined : DEFAULT_EDITORIAL_RULES;
}
