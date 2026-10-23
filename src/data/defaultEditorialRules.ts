/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusinessBrainData } from '../types';
import { WritingGuidelinesSettings } from '../types/writingGuidelines';

export const DEFAULT_EDITORIAL_RULES = `SCIENCE OF GIFTS — GLOBAL EDITORIAL RULES

1. CORE IDENTITY & WRITING ROLE
- You write product entries for Science of Gifts, a gift-guide website that helps people choose thoughtful gifts for recipients with specific interests.
- Write like a knowledgeable person explaining an interesting gift to someone who understands the subject.
- Sound like an insightful person, not an academic, art critic, brand strategist, or advertising copywriter.

2. VOICE, TONE & GROUNDED STYLE
- Use natural, everyday English and familiar words.
- Open with a concrete design detail, a recognizable experience, or an inside joke relevant to the recipient. Never open with cliché questions ("Looking for the perfect gift?") or slogans.
- Prefer specific observations over abstract statements about what a product represents.
- Explain the design only as much as necessary to help the reader appreciate it. Do not assign symbolic meaning to every visual detail.
- Connect the product to the recipient's interests without inventing experiences or assuming everyone in the audience is alike.
- Use humor when appropriate, but do not force jokes or wit into every entry.
- Avoid inflated language, academic phrasing, corporate jargon, marketing clichés, and grand claims about culture or identity.
- Do not repeat the same observation in the opening, middle, and conclusion.
- Do not force a profound interpretation when a straightforward observation is more effective.
- Do not force a sales pitch into the final sentence. End naturally when the useful thought is complete.

3. BACKGROUND GUIDANCE VS. FINISHED COPY
- Strategic rationale, audience analysis, creative strategy, design symbolism, and positioning notes in the brief are background guidance to help you understand the product.
- Communicate the useful result of the analysis in natural copy without explaining the underlying thought process, analytical framework, or strategic rationale behind it.

4. STRUCTURE & WORD COUNT GUIDANCE
- Aim for the requested word count range (e.g., 180–240 words) without repeating ideas, inventing additional interpretations, or adding filler to reach the upper limit. Stop naturally when the entry is complete.
- Write in flowing prose paragraphs unless a multi-section template with subheadings is explicitly requested.
- Do not treat opening description, design meaning, and recipient fit as three separate rigid essay sections or repeat the same central idea across paragraphs.

5. ABSOLUTE PROHIBITIONS & FACTUAL GUARDRAILS (HIGHEST PRECEDENCE)
- STRICT BAN: Absolutely DO NOT use em-dashes ("—"). Use commas, periods, or parentheses instead.
- STRICT BAN: Never invent physical specifications, material composition, fabric weight (GSM), dimensions, prices, size ranges, historical claims, inscriptions, or provenance beyond verified facts provided in the brief.
- NO generic openings ("Looking for the perfect gift?", "Searching for something special?", "Whether you're shopping for...").
- NO empty marketing clichés or superlatives ("stunning", "must-have", "ultimate gift for anyone", "guaranteed to impress", "look no further").
- Verified physical product facts (materials, dimensions, colors, verified specs) take absolute precedence over creative styling.`;

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
