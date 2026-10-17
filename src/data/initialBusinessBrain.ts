/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusinessBrainData, GiftGuide } from '../types';

export const INITIAL_BUSINESS_BRAIN: BusinessBrainData = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  businessPositioning: `Science of Gifts is an editorial gift-guide publication paired with a curated print-on-demand shop. 
Unlike conventional ecommerce stores that sell generic commodities (e.g., selling a generic T-shirt because someone wants clothing), Science of Gifts conceives and curates products for highly specific passions and helps gift buyers find deeply meaningful, intellectually resonant gifts for recipients with those interests.
Our goal is to bridge the gap between a gift buyer (who wants to express care, understanding, and thoughtfulness) and a passionate recipient (who values accuracy, nuance, and design restraint).`,

  websiteShopStructure: `Main Website: Publishes comprehensive, thoughtfully written gift guides, historical context essays, and cultural deep dives.
Print-on-Demand Shop: Carries niche-specific apparel, drinkware, stationery, and home goods created to embody authentic interest motifs without looking like generic tourist merchandise.`,

  targetAudiences: `Our core niches include:
- History Enthusiasts: Military history (American Civil War, WWII, Napoleonic era), Ancient civilizations (Rome, Greece, Egypt), Medieval and Viking eras.
- Viking Culture & Norse Mythology: Crucial distinction between Norse mythology buffs (lore, runes, pantheon), historical Viking enthusiasts (archaeology, seafaring, settlements), and aesthetic admirers.
- Literature & Writing: Classic authors, modernist poets, screenwriters, bibliophiles who appreciate literary references over cheesy puns.
- Filmmakers & Cinephiles: Directors, cinematographers, analog photography buffs, classic cinema scholars.
- Science & Engineering: Space exploration, botany, physics, astronomy, industrial design.`,

  editorialVoiceAndRules: `1. Write for the gift buyer while deeply respecting the recipient.
2. Explain why the specific product is appropriate for the specific person.
3. Prefer concrete design observations to generic praise.
4. Never use generic AI fluff or hyperbolic praise ("the ultimate must-have").
5. Preserve a natural, human, authoritative editorial tone.
6. The brief must give ChatGPT actionable instructions, never finished marketing copy.`,

  giftGuidePhilosophy: `A gift guide is not an endless catalogue dump; it is a curated editorial argument. Each item must have a distinct reason for inclusion:
- It solves a specific recipient persona archetype.
- It introduces an aesthetic, functional, or price-point balance to the guide.
- It respects the recipient's level of knowledge (avoiding patronizing or historically inaccurate tropes).
- If guide contents are unknown, we must acknowledge that uniqueness within the guide cannot yet be fully verified.`,

  productPositioningPrinciples: `Products succeed as gifts when they act as an "insider handshake" rather than a billboard.
- Distinctive over generic: Highlight subtle design motifs that only someone who understands the niche will recognize.
- Emotional & intellectual appeal: Why will the recipient feel understood when unwrapping this?
- Buyer ease: Give the buyer confidence that they are giving something legitimate and thoughtful.`,

  seoPrinciples: `Treat SEO as supporting discovery and usefulness rather than replacing editorial judgment.
- Avoid keyword stuffing and robotic repetition.
- Emphasize search intent: gift buyers search for "gifts for Civil War buffs" or "WWII aviation history gifts," not just "airplane mug."
- Do not claim to know keyword search volumes or competitor ranks without live verified API data.`,

  knownCollections: `1. The Viking Chronicles (Lindisfarne, Danelaw, Edda excerpts, runic inscriptions with verifiable translations)
2. American Civil War Regimental Series (20th Maine, Iron Brigade, tactical maps)
3. WWII Aviation & Navies (Battle of Britain, Spitfire blueprints, naval charts)
4. Classic Literature & Great Writers (Homer's Odyssey, James Joyce, Virginia Woolf)
5. Cinema & Director Tributes (Auteur theory, cinematography framing grids)`,

  historicalCulturalAccuracy: `Crucial mandate: When historical, cultural, or literary references appear, distinguish visible observation from interpretation.
- Do NOT invent historical meanings, origins, provenance, inscriptions, or production specs.
- Note any rune, Latin, or Greek text that requires translation or scholarly verification before publication.
- Distinguish archaeological reality from romanticized Victorian or Hollywood folklore (e.g., horned helmets are myth; historical Norse art used Borre, Jelling, or Urnes styles).`,

  prohibitedPatterns: `Strictly banned phrases and tropes:
- "The perfect gift for any fan" or "Must-have for any enthusiast"
- "Look no further!" or "Guaranteed to impress!"
- "Whether you're shopping for yourself or a loved one..."
- Keyword-stuffed descriptions like "Civil War mug gift for men dad brother"
- Inventing material specs (e.g. "crafted from premium archival ceramic" unless verified)`,

  additionalInstructions: `Always evaluate the difference between the buyer's motivation (showing thoughtfulness, finding a safe yet distinctive present) and the recipient's criteria (authenticity, design subtlety, wearability). Highlight potential audience mismatches clearly.`
};

export const INITIAL_GIFT_GUIDES: GiftGuide[] = [
  {
    id: 'guide-viking-history',
    name: 'The Definitive Gift Guide for Viking History & Norse Culture Enthusiasts',
    description: 'Curated apparel, drinkware, and artifacts for serious students of Norse history, sagas, and archaeological culture.',
    targetPersona: 'Historians, re-enactors, and Norse mythology aficionados',
    niche: 'Viking History & Norse Culture',
    itemCount: 14
  },
  {
    id: 'guide-civil-war',
    name: 'Thoughtful Gifts for American Civil War Buffs & Battlefield Visitors',
    description: 'Gifts focused on regimental histories, strategic maps, and authentic period accounts rather than generic memorabilia.',
    targetPersona: 'Battlefield tourists, Civil War book readers, and amateur historians',
    niche: 'American Civil War',
    itemCount: 18
  },
  {
    id: 'guide-filmmakers',
    name: 'Gifts for Cinephiles, Screenwriters & Independent Filmmakers',
    description: 'Gifts honoring auteur cinema, screenplay craft, and visual storytelling craft.',
    targetPersona: 'Film school students, directors, writers, and arthouse cinema fans',
    niche: 'Cinema & Filmmaking',
    itemCount: 12
  },
  {
    id: 'guide-wwii-aviation',
    name: 'WWII Aviation & Maritime Heritage Gift Guide',
    description: 'Authentic tributes to historical aircraft, naval engineering, and allied operations.',
    targetPersona: 'Scale modelers, aviation historians, and veterans’ descendants',
    niche: 'WWII History',
    itemCount: 16
  },
  {
    id: 'guide-ancient-greece',
    name: 'Classical Antiquity: Gifts for Greek Mythology & Philosophy Lovers',
    description: 'Honoring Homeric epics, Stoic philosophy, and classical Greek architecture and art.',
    targetPersona: 'Classics majors, philosophy readers, and mythology enthusiasts',
    niche: 'Classics & Philosophy',
    itemCount: 9
  }
];
