/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContextProfile } from '../types';

export const INITIAL_CONTEXT_PROFILES: ContextProfile[] = [
  {
    id: 'profile-viking-gifts',
    name: 'Viking Gifts',
    description: 'Norse culture, Anglo-Saxon chronicles, archaeological runes, and 8th-11th century Scandinavian history.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    context: {
      giftGuideId: 'guide-viking-history',
      giftGuideName: 'The Definitive Gift Guide for Viking History & Norse Culture Enthusiasts',
      primaryRecipient: 'Serious student or reader of Norse medieval history who appreciates primary chronicle citations',
      secondaryRecipient: 'Re-enactor, Anglo-Saxon or Viking history podcast listener, museum visitor',
      audienceInterest: 'Anglo-Saxon Chronicles, 8th-century Northumbria, Danelaw, Urnes knotwork, authentic runic inscriptions',
      occasion: 'Milestone birthday, holiday season, graduation, academic achievement gift',
      initialPositioningIdea: 'An insider handshake for real history nerds who wince at cartoon fantasy Vikings and appreciate authentic primary source citations.',
      productSpecs: 'Dishwasher & microwave safe ceramic or ring-spun cotton; archival matte inks; historical accuracy checked',
      knownDesignReferences: 'Anglo-Saxon Chronicle (MS Tiberius), Urnes/Borre knotwork, Lindisfarne stone carver motifs, Old English & Old Norse transcriptions',
      specificQuestions: 'Ensure the brief steers clear of pop-culture horned helmet tropes and emphasizes scholarly and cultural authenticity.'
    }
  },
  {
    id: 'profile-civil-war-gifts',
    name: 'Civil War Gifts',
    description: 'American Civil War buffs, regimental history, battlefield preservation, and tactical cartography.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    context: {
      giftGuideId: 'guide-civil-war',
      giftGuideName: 'Thoughtful Gifts for American Civil War Buffs & Battlefield Visitors',
      primaryRecipient: 'Battlefield tourist, Gettysburg enthusiast, or military history reader who admires tactical discipline and primary sources',
      secondaryRecipient: 'History teacher, reenactment attendee, or Civil War Roundtable member',
      audienceInterest: 'Battle of Gettysburg, Little Round Top, Col. Joshua Lawrence Chamberlain, Official Records of the War, tactical maps',
      occasion: 'Father\'s Day, holiday gift, post-battlefield tour memento',
      initialPositioningIdea: 'Respectful, somber regimental tribute celebrating steadfast leadership without romanticizing wartime horrors.',
      productSpecs: 'Comfortable premium cotton apparel or heavy-duty ceramic drinkware suitable for daily study and display',
      knownDesignReferences: 'Official topographical maps from the War Department, 20th Maine regimental muster rolls, Chamberlain\'s post-battle dispatches',
      specificQuestions: 'How should the brief guide ChatGPT to frame tactical bravery while respecting the grim human cost of the engagement?'
    }
  },
  {
    id: 'profile-greek-mythology-gifts',
    name: 'Greek Mythology Gifts',
    description: 'Classics scholars, Hellenic literature, Homeric epic readers, and ancient philosophy enthusiasts.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    context: {
      giftGuideId: 'guide-classics-mythology',
      giftGuideName: 'Thoughtful Gifts for Classics Majors, Homeric Scholars & Greek Mythology Buffs',
      primaryRecipient: 'Reader of classical literature (Homer, Hesiod, Attic tragedy) who appreciates authentic Greek text and understated symbolism',
      secondaryRecipient: 'Philosophy student, museum visitor, Percy Jackson graduate reading original translations',
      audienceInterest: 'The Odyssey, Penelope\'s shroud, Attic black-figure pottery, ancient Greek typography, Homeric epithets',
      occasion: 'Academic term completion, thesis defense, birthday, literary gift',
      initialPositioningIdea: 'Celebrates enduring literary devotion, fidelity, and intellect over generic superhero pantheon depictions.',
      productSpecs: 'Archival paper notebook with smyth-sewn binding or matte ceramic mug with crisp typographic reproduction',
      knownDesignReferences: 'Attic red-figure & black-figure vase paintings, Homeric Greek uncial script, archaic geometric Greek borders',
      specificQuestions: 'Ensure ancient Greek lettering is verified as grammatically correct and authentic to Homeric dialect.'
    }
  },
  {
    id: 'profile-wwii-gifts',
    name: 'World War II Gifts',
    description: 'Aviation heritage, naval history, Battle of Britain, codebreakers, and WWII veterans’ memory.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    context: {
      giftGuideId: 'guide-wwii-history',
      giftGuideName: 'Memorable Gifts for WWII Historians, Aviation Buffs & Veterans’ Families',
      primaryRecipient: 'Aviation buff, WWII historian, or scale modeler with encyclopedic knowledge of aircraft specifications and wartime operations',
      secondaryRecipient: 'Grandchild of a veteran, airshow attendee, military history documentary enthusiast',
      audienceInterest: 'Supermarine Spitfire, RAF Fighter Command, Bletchley Park cryptographic systems, Merlin engines, 1940 air doctrine',
      occasion: 'Veterans Day, anniversary of pivotal operations, holiday season, retirement gift',
      initialPositioningIdea: 'Understated technical reverence focusing on the engineering brilliance and human endurance of Allied aviators.',
      productSpecs: 'Technical blueprint-grade linework reproduction, heavy museum-grade cardstock or premium apparel',
      knownDesignReferences: 'Air Ministry blueprints, Supermarine technical manuals, squadron operations logbooks, camouflage pattern schemes',
      specificQuestions: 'Emphasize technical accuracy of tail markings, roundel dimensions, and squadron codes to satisfy exacting rivet-counters.'
    }
  },
  {
    id: 'profile-filmmaker-gifts',
    name: 'Filmmaker Gifts',
    description: 'Indie directors, cinematographers, analog celluloid photographers, screenwriters, and auteur cinephiles.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    context: {
      giftGuideId: 'guide-filmmaking-cinema',
      giftGuideName: 'Subtle, Non-Cliche Gifts for Film Directors, Cinematographers & Cinephiles',
      primaryRecipient: 'Working indie filmmaker, film school student, or serious cinephile who cringes at cliché film-reel / clapboard novelty items',
      secondaryRecipient: 'Screenwriter, analog 35mm photographer, film festival volunteer, video editor',
      audienceInterest: 'Aspect ratios, 24fps motion cadence, golden ratio framing grids, 35mm film grain, French New Wave, director shot lists',
      occasion: 'Film wrap party, festival premiere, film school graduation, birthday',
      initialPositioningIdea: 'An inside tool aesthetic celebrating the craft of visual framing and lighting rather than Hollywood tourist trinkets.',
      productSpecs: 'Matte black anti-reflective finishes, clean graphic lines, durable materials designed for set life',
      knownDesignReferences: 'Director\'s viewfinder optics, frame guidelines (2.39:1, 1.85:1, 1.33:1), Arriflex / Panavision technical calibration charts',
      specificQuestions: 'How can the brief reinforce that the recipient will appreciate rigorous cinematography references without generic cheesy movie slogans?'
    }
  }
];
