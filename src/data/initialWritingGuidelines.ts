/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WritingGuidelinesSettings, ApprovedWritingExample } from '../types/writingGuidelines';
import { INITIAL_WRITING_EXAMPLES as BASE_EXAMPLES } from './initialWritingExamples';

export const INITIAL_WRITING_GUIDELINES: WritingGuidelinesSettings = {
  id: 'active_guidelines',
  universalGuidelines: `1. Write for the gift buyer. Help readers understand who a product suits, why it is appealing, and how it differs from other options.
2. Use natural, human, editorial prose. Favor specific observations and meaningful details over generic enthusiasm.
3. Give each product a distinctive editorial angle. Do not repeat the same selling point across multiple entries.
4. Use SEO naturally in service of clarity and discoverability. Never keyword-stuff or sacrifice readability for search phrases.
5. Do not invent product specifications, materials, prices, availability, historical claims, or other unsupported facts.
6. Preserve the requested format and follow relevant content-type instructions.
7. Treat approved examples as editorial calibration, not text to copy.
8. Avoid repeatedly labeling recipients with generic niche labels when more specific language would sound natural.
9. Favor concise, useful writing without forcing every entry into the same sentence or paragraph structure.`,
  voiceAndTone: `Knowledgeable, discerning, respectful of specialist knowledge, intellectually curious, calm, and trustworthy. Avoid breathless marketing hype ("the ultimate gift for anyone") and forced internet humor. Speak directly to thoughtful gift-givers.`,
  styleAndFormatting: `Use italics for titles, publications, and specific manuscript names where appropriate. Avoid unnecessary bold formatting in finished gift-guide copy. Do not use em dashes in generated copy. Keep paragraphs focused and distinct.`,
  thingsToAvoid: `- Generic promotional language and empty superlatives ("stunning", "must-have", "ultimate").
- Clichés and formulaic AI transition phrases ("Whether you're shopping for...").
- Repetitive product-entry structures.
- Keyword stuffing or unnatural SEO phrasing.
- Invented facts, unverified historical claims, prices, or availability.
- Em dashes (—).`,
  factualAndEditorialGuardrails: `Never fabricate historical claims, archaeological provenances, material compositions, pricing, or product specs. If information is uncertain or missing from catalogue records, explicitly flag it for verification or ask the user.`,
  contentTypeProfiles: {
    product_entry: {
      instructions: 'Focus on the specific design motif, historical/cultural reference, or functional utility. Explain why the recipient will appreciate it and how it distinguishes itself from other items. Incorporate verified product facts naturally without invention.',
      formattingRules: 'Target length: 210 words (permitted range 180–240 words). Typical structure: 2 or 3 paragraphs. Lead with a concrete observational hook. Do not use em dashes. Avoid unsupported lifestyle or performance claims.'
    },
    introduction: {
      instructions: 'Establish what the reader is looking for, why this niche makes gift selection interesting, and what distinguishes this guide selection. Avoid generic opening fluff about holiday shopping stress.',
      formattingRules: '2 to 3 paragraphs max. Ground the opening in the specific buyer problem.'
    },
    buying_advice: {
      instructions: 'Provide practical decision criteria tailored to the niche and recipient knowledge depth, daily habits, and aesthetic preferences.',
      formattingRules: 'Use clear subheadings and actionable bullet points.'
    },
    faq: {
      instructions: 'Address genuine reader concerns grounded in the niche, products, and available information without repeating guide headings.',
      formattingRules: 'Q&A format with concise, factual answers.'
    },
    closing: {
      instructions: 'Provide a thoughtful wrap-up encouraging final decision making or directing readers to related guides.',
      formattingRules: 'Single concise concluding paragraph.'
    },
    informational_article: {
      instructions: 'Provide thorough background, historical context, or curation methodology with high intellectual integrity.',
      formattingRules: 'Structured editorial format with clear thematic sections.'
    }
  },
  updatedAt: new Date().toISOString()
};

export const INITIAL_WRITING_EXAMPLES_LIST: ApprovedWritingExample[] = BASE_EXAMPLES.map((ex) => ({
  ...ex,
  contentType: 'product_entry' as const
}));
