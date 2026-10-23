/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductRecord } from '../types';
import { createSampleProductMockup } from '../utils/imageUtils';

export const SEED_CATALOGUE_PRODUCTS: ProductRecord[] = [
  // Pair 1A: Generic Pop-Culture Viking Warrior Mug (Conceptual Overlap with Pair 1B)
  {
    id: 'prod-valhalla-berserker-mug',
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-15T14:30:00Z',
    publicationStatus: 'published',
    catalogueSource: 'seed_catalogue',
    verifiedFields: ['workingName', 'productType', 'productSpecs'],
    details: {
      workingName: 'Viking Valhalla Berserker Axe Ceramic Mug',
      productType: 'mug',
      giftGuideId: 'guide-viking-history',
      giftGuideName: 'The Definitive Gift Guide for Viking History & Norse Culture Enthusiasts',
      primaryRecipient: 'Casual Viking mythology and warrior aesthetic fan',
      secondaryRecipient: 'Fantasy gamer, metalhead, or pop-culture Norse enthusiast',
      audienceInterest: 'Valhalla, Odin warrior tropes, Vikings TV show, axes and battle glory',
      occasion: 'Casual birthday or humorous holiday gift',
      productUrl: 'https://shop.scienceofgifts.com/products/valhalla-berserker-mug',
      currentTitle: 'Valhalla Awaits Berserker Warrior Viking Coffee Mug',
      currentDescription: 'Bold black ceramic mug with dual bearded axes, horned helmet silhouette, and distressed "Until Valhalla" runic-style lettering.',
      productSpecs: '11 oz black ceramic, dishwasher safe',
      knownDesignReferences: 'Modern pop-culture fantasy Viking imagery, distressed stencil fonts',
      initialPositioningIdea: 'Punchy gift for someone who loves aggressive Viking mythology and gym/gaming energy.',
      specificQuestions: 'Does this overlap too heavily with other warrior-themed designs in the guide?'
    },
    imageFileName: 'valhalla_berserker_mug.png',
    imageMimeType: 'image/png',
    imageSize: 42000,
    imageDataUrl: createSampleProductMockup('UNTIL VALHALLA', 'BERSERKER AXE POP TROPES', 'viking').dataUrl,
    mode: 'full',
    status: 'completed'
  },

  // Pair 1B: Sons of Odin Warrior Graphic Tee (Visually distinct format, but CONCEPTUALLY OVERLAPPING with 1A)
  {
    id: 'prod-odin-warrior-tee',
    createdAt: '2026-09-12T11:00:00Z',
    updatedAt: '2026-09-16T09:15:00Z',
    publicationStatus: 'published',
    catalogueSource: 'seed_catalogue',
    verifiedFields: ['workingName', 'productType'],
    details: {
      workingName: 'Sons of Odin Berserker Combat Graphic Tee',
      productType: 't-shirt',
      giftGuideId: 'guide-viking-history',
      giftGuideName: 'The Definitive Gift Guide for Viking History & Norse Culture Enthusiasts',
      primaryRecipient: 'Casual pop-culture Viking enthusiast seeking aggressive warrior apparel',
      secondaryRecipient: 'Fitness / gym enthusiast or pagan metal fan',
      audienceInterest: 'Odin, raven warriors, battle fury, Norse pagan aesthetic',
      occasion: 'Birthday or everyday casual gift',
      productUrl: 'https://shop.scienceofgifts.com/products/sons-of-odin-tee',
      currentTitle: 'Sons of Odin Berserker Viking Graphic T-Shirt',
      currentDescription: 'Heavyweight black tee with distressed raven wings, runic circle border, and blood-oath battle warrior motif.',
      productSpecs: '100% carded cotton, screen printed front chest and back graphic',
      knownDesignReferences: 'Modern graphic illustration of Viking warriors, generic pseudo-runes',
      initialPositioningIdea: 'Standard warrior-identity shirt celebrating fearless mythological grit.',
      specificQuestions: 'Is this concept duplicated by our axe mug?'
    },
    imageFileName: 'odin_warrior_tee.png',
    imageMimeType: 'image/png',
    imageSize: 45000,
    imageDataUrl: createSampleProductMockup('SONS OF ODIN', 'BERSERKER COMBAT APPAREL', 'viking').dataUrl,
    mode: 'full',
    status: 'completed'
  },

  // Pair 2A: Lindisfarne 793 Chronicle Mug (Same Subject: Viking History, but DISTINCT HISTORICAL SCHOLARSHIP POSITIONING)
  {
    id: 'prod-lindisfarne-793-mug',
    createdAt: '2026-09-14T08:00:00Z',
    updatedAt: '2026-09-18T16:20:00Z',
    publicationStatus: 'published',
    catalogueSource: 'seed_catalogue',
    verifiedFields: ['workingName', 'productType', 'knownDesignReferences', 'productSpecs'],
    details: {
      workingName: 'Lindisfarne 793 AD Chronicle Ceramic Mug',
      productType: 'mug',
      giftGuideId: 'guide-viking-history',
      giftGuideName: 'The Definitive Gift Guide for Viking History & Norse Culture Enthusiasts',
      primaryRecipient: 'Serious student or reader of Norse medieval history who appreciates primary chronicle citations',
      secondaryRecipient: 'Re-enactor, medievalist, or Anglo-Saxon / Viking history podcast listener',
      audienceInterest: 'Anglo-Saxon Chronicles, 8th-century Northumbria, Viking expansion historiography',
      occasion: 'Birthday, academic milestone, or holiday gift',
      productUrl: 'https://shop.scienceofgifts.com/products/lindisfarne-793-mug',
      currentTitle: 'Viking Lindisfarne Raid 793 AD Chronicle Coffee Mug',
      currentDescription: 'Ceramic 15oz mug with chronicle excerpt in Old English and scholarly translation detailing the sudden sea raiders at Holy Island.',
      productSpecs: '15 oz black ceramic, dishwasher and microwave safe, high-contrast matte archival print',
      knownDesignReferences: 'Anglo-Saxon Chronicle (Cotton Tiberius MS), authentic Urnes knotwork border, no cartoon horns',
      initialPositioningIdea: 'An insider handshake for real history nerds who wince at cartoon Vikings and appreciate authentic 8th-century primary sources.',
      specificQuestions: 'How does this differentiate from generic battle-axe mugs in the same guide?'
    },
    imageFileName: 'lindisfarne_793_mug.png',
    imageMimeType: 'image/png',
    imageSize: 48000,
    imageDataUrl: createSampleProductMockup('793 AD • LINDISFARNE', 'ANGLO-SAXON CHRONICLE FOLIO SPECIMEN', 'viking').dataUrl,
    mode: 'full',
    status: 'completed'
  },

  // Pair 2B: Elder Futhark Epigraphic Field Journal (Same Subject: Viking Culture, but DISTINCT LINGUISTIC / PALEOGRAPHIC POSITIONING)
  {
    id: 'prod-futhark-field-journal',
    createdAt: '2026-09-15T09:30:00Z',
    updatedAt: '2026-09-20T11:45:00Z',
    publicationStatus: 'in_review',
    catalogueSource: 'seed_catalogue',
    verifiedFields: ['workingName', 'productType', 'productSpecs', 'knownDesignReferences'],
    details: {
      workingName: "Elder Futhark Rune-Carver's Hardcover Field Journal",
      productType: 'notebook',
      giftGuideId: 'guide-viking-history',
      giftGuideName: 'The Definitive Gift Guide for Viking History & Norse Culture Enthusiasts',
      primaryRecipient: 'Linguistics student, epigrapher, calligrapher, or Old Norse language learner',
      secondaryRecipient: 'Historical reenactor keeping an authentic field ledger',
      audienceInterest: 'Runic epigraphy, Elder Futhark phonetic values, Kylver stone inscriptions, Old Norse linguistics',
      occasion: 'Graduation, field research trip, or back-to-study gift',
      productUrl: 'https://shop.scienceofgifts.com/products/elder-futhark-journal',
      currentTitle: 'Elder Futhark Epigraphic Runic Hardcover Field Journal',
      currentDescription: 'Linen-bound archival ledger featuring blind-debossed Elder Futhark rune chart with archaeological stone provenance notes.',
      productSpecs: '200 dot-grid numbered pages, 120gsm fountain-pen friendly paper, Smyth-sewn binding',
      knownDesignReferences: 'Kylver Stone (Gotland, Sweden, c. 400 AD), Vadstena bracteate runic alphabet',
      initialPositioningIdea: 'A dignified academic desk tool focusing on literacy, inscription craft, and ancient linguistics rather than warfare.',
      specificQuestions: 'Can we prove to the gift buyer that this has legitimate archaeological credibility?'
    },
    imageFileName: 'elder_futhark_journal.png',
    imageMimeType: 'image/png',
    imageSize: 44000,
    imageDataUrl: createSampleProductMockup('ELDER FUTHARK', 'EPIGRAPHIC RUNIC FIELD LEDGER', 'viking').dataUrl,
    mode: 'full',
    status: 'completed'
  },

  // Pair 3A: 20th Maine Regimental Graphic Tee (Civil War; Casual battlefield tourist & tactical enthusiast)
  {
    id: 'prod-civil-war-tee',
    createdAt: '2026-09-16T14:00:00Z',
    updatedAt: '2026-09-21T10:10:00Z',
    publicationStatus: 'published',
    catalogueSource: 'seed_catalogue',
    verifiedFields: ['workingName', 'productType', 'productSpecs'],
    details: {
      workingName: '20th Maine "Stand Firm" Regimental Graphic Tee',
      productType: 't-shirt',
      giftGuideId: 'guide-civil-war',
      giftGuideName: 'Thoughtful Gifts for American Civil War Buffs & Battlefield Visitors',
      primaryRecipient: 'Battlefield tourist, Gettysburg visitor, or military history reader who admires tactical discipline',
      secondaryRecipient: 'High school history teacher or Civil War roundtable member',
      audienceInterest: 'Battle of Gettysburg, Col. Joshua Lawrence Chamberlain, Little Round Top',
      occasion: 'Father’s Day, holiday, or post-battlefield trip present',
      productUrl: 'https://shop.scienceofgifts.com/products/20th-maine-tee',
      currentTitle: '20th Maine Little Round Top Civil War T-Shirt',
      currentDescription: 'Vintage-washed navy graphic tee featuring an accurate topographic contour of Little Round Top and regimental Maltese cross.',
      productSpecs: '100% ring-spun combed cotton, vintage washed ink navy, water-based breathable screenprint',
      knownDesignReferences: 'G.K. Warren 1863 topographical survey map, Maltese cross of the V Corps',
      initialPositioningIdea: 'A subtle, wearable homage that prioritizes cartographic accuracy over loud patriotic or partisan sloganry.',
      specificQuestions: 'Can we highlight why the gift buyer can trust this tee not to look cheap or touristy?'
    },
    imageFileName: 'civil_war_tee.png',
    imageMimeType: 'image/png',
    imageSize: 46000,
    imageDataUrl: createSampleProductMockup('20TH MAINE • JULY 2 1863', 'LITTLE ROUND TOP TOPOGRAPHICAL CONTOUR', 'civil_war').dataUrl,
    mode: 'full',
    status: 'completed'
  },

  // Pair 3B: 1863 Gettysburg Cartographic Survey Canvas Portfolio (Civil War; SAME NICHE, but SCHOLARLY ARCHIVAL COLLECTOR)
  {
    id: 'prod-civil-war-map-portfolio',
    createdAt: '2026-09-17T15:20:00Z',
    updatedAt: '2026-09-22T13:40:00Z',
    publicationStatus: 'draft',
    catalogueSource: 'seed_catalogue',
    verifiedFields: ['workingName', 'productType', 'productSpecs', 'knownDesignReferences'],
    details: {
      workingName: '1863 Gettysburg Little Round Top Cartographic Survey Portfolio',
      productType: 'poster',
      giftGuideId: 'guide-civil-war',
      giftGuideName: 'Thoughtful Gifts for American Civil War Buffs & Battlefield Visitors',
      primaryRecipient: 'Archival map collector, military staff college researcher, or serious Civil War historian',
      secondaryRecipient: 'Attorney, professor, or executive who frames historical military cartography in their office',
      audienceInterest: 'US War Department topographical surveys, engineering cartography, Gettysburg tactical elevation contours',
      occasion: 'Retirement, promotion, or major milestone gift',
      productUrl: 'https://shop.scienceofgifts.com/products/gettysburg-cartographic-portfolio',
      currentTitle: '1863 Gettysburg Little Round Top Official Topographical Survey Canvas Print',
      currentDescription: 'Archival giclée canvas reproduction of General Warren’s original July 1863 contour elevation survey, mounted on solid wood battens.',
      productSpecs: '24x36 inch museum-grade cotton canvas, pigment ink, solid oak hanging rails',
      knownDesignReferences: 'National Archives Record Group 77 (Civil War Topographical Engineers Maps)',
      initialPositioningIdea: 'A statement wall piece for discerning collectors who study tactical elevation and archival engineering.',
      specificQuestions: 'How does this avoid competing with our casual 20th Maine t-shirt?'
    },
    imageFileName: 'gettysburg_map_portfolio.png',
    imageMimeType: 'image/png',
    imageSize: 52000,
    imageDataUrl: createSampleProductMockup('GETTYSBURG 1863', 'CORPS OF ENGINEERS TOPOGRAPHICAL SURVEY', 'civil_war').dataUrl,
    mode: 'full',
    status: 'completed'
  },

  // Item 4: Spartan Thermopylae Decal (MISSING DESCRIPTION & MISSING IMAGE — UNCERTAINTY TEST CASE)
  {
    id: 'prod-spartan-shield-decal',
    createdAt: '2026-09-18T12:00:00Z',
    updatedAt: '2026-09-18T12:00:00Z',
    publicationStatus: 'unassigned',
    catalogueSource: 'imported_csv',
    verifiedFields: ['workingName', 'productType'],
    details: {
      workingName: 'Spartan Thermopylae Lambda Shield Vinyl Decal',
      productType: 'other',
      giftGuideId: 'guide-ancient-greece',
      giftGuideName: 'Classical Antiquity: Gifts for Greek Mythology & Philosophy Lovers',
      primaryRecipient: '', // Missing
      secondaryRecipient: '',
      audienceInterest: 'Spartan history, Battle of Thermopylae',
      occasion: '',
      productUrl: 'https://shop.scienceofgifts.com/products/spartan-shield-decal',
      currentTitle: 'Spartan Shield Decal 300 Molon Labe',
      currentDescription: '', // Missing description
      productSpecs: '', // Missing specifications
      knownDesignReferences: '', // Missing references
      initialPositioningIdea: '',
      specificQuestions: ''
    },
    imageFileName: '',
    imageMimeType: '',
    imageSize: 0,
    imageDataUrl: undefined, // No image mockup uploaded
    mode: 'full',
    status: 'draft'
  },

  // Item 5: Penelope's Loom Odyssey Hardcover Journal (Classical Literature Guide)
  {
    id: 'prod-odyssey-journal',
    createdAt: '2026-09-19T09:00:00Z',
    updatedAt: '2026-09-23T14:10:00Z',
    publicationStatus: 'published',
    catalogueSource: 'seed_catalogue',
    verifiedFields: ['workingName', 'productType', 'productSpecs', 'knownDesignReferences'],
    details: {
      workingName: "Penelope's Loom & The Odyssey Hardcover Journal",
      productType: 'notebook',
      giftGuideId: 'guide-ancient-greece',
      giftGuideName: 'Classical Antiquity: Gifts for Greek Mythology & Philosophy Lovers',
      primaryRecipient: 'Literature student, translator, or writer fascinated by epic poetry and Penelope’s agency in Ithaca',
      secondaryRecipient: 'Classicist, high school humanities teacher, or bibliophile',
      audienceInterest: 'Homeric epics, ancient Greek weaving motifs, classical literature',
      occasion: 'Graduation, semester start, or book club celebration',
      productUrl: 'https://shop.scienceofgifts.com/products/penelopes-loom-journal',
      currentTitle: 'Homer Odyssey Penelope Weaving Hardcover Journal',
      currentDescription: 'Faux-cloth bound journal with blind debossed geometric Greek loom pattern and line 95-105 of Odyssey Book II in ancient Greek script.',
      productSpecs: '192 ruled pages, 100gsm acid-free cream paper, ribbon marker, expandable back pocket',
      knownDesignReferences: 'Geometrical Greek vase painting (8th century BCE), Greek text from the Loeb Classical Library edition',
      initialPositioningIdea: 'A quiet, dignified desk journal honoring deliberate patience and literary intellect over loud mythological thunderbolts.',
      specificQuestions: 'How should the brief instruct ChatGPT to discuss Penelope’s loom without descending into cliché domesticity?'
    },
    imageFileName: 'odyssey_journal.png',
    imageMimeType: 'image/png',
    imageSize: 47000,
    imageDataUrl: createSampleProductMockup('PENELOPE’S LOOM', 'HOMER • ODYSSEY BOOK II • ITHACA', 'odyssey').dataUrl,
    mode: 'full',
    status: 'completed'
  },

  // Item 6: Supermarine Spitfire Mk IX Blueprint Desk Pad (WWII Aviation Guide)
  {
    id: 'prod-spitfire-merlin-deskpad',
    createdAt: '2026-09-20T10:15:00Z',
    updatedAt: '2026-09-24T15:00:00Z',
    publicationStatus: 'published',
    catalogueSource: 'seed_catalogue',
    verifiedFields: ['workingName', 'productType', 'productSpecs', 'knownDesignReferences'],
    details: {
      workingName: 'Supermarine Spitfire Mk IX Merlin Engine Blueprint Desk Pad',
      productType: 'other', // desk accessory / mat
      giftGuideId: 'guide-wwii-history',
      giftGuideName: 'World War II Military History & Aviation Engineering Gifts',
      primaryRecipient: 'Aviation engineer, flight simulator pilot, or RAF Battle of Britain historian',
      secondaryRecipient: 'Mechanical engineering student or model aircraft builder',
      audienceInterest: 'Rolls-Royce Merlin 61 engine, elliptical wing aerodynamics, Battle of Britain technology',
      occasion: 'Milestone work anniversary, holiday, or home office setup gift',
      productUrl: 'https://shop.scienceofgifts.com/products/spitfire-blueprint-deskpad',
      currentTitle: 'Supermarine Spitfire Mk IX Merlin 61 Engine Technical Blueprint Desk Pad',
      currentDescription: 'Extra-large 35x16 inch micro-textured desk mat printed with authentic Vickers-Armstrong schematic engineering schematics.',
      productSpecs: '35.4 x 15.7 inches, 4mm thick natural rubber base, anti-fray stitched edges, water-repellent micro-weave',
      knownDesignReferences: 'Supermarine Aviation technical drawings dated May 1942, Rolls-Royce Ltd. engine cross-sections',
      initialPositioningIdea: 'An immersive desk surface celebrating industrial design and aeronautical engineering rather than generic war patriotism.',
      specificQuestions: 'Can we assure the buyer that the technical annotations are authentic historical blueprints?'
    },
    imageFileName: 'spitfire_deskpad.png',
    imageMimeType: 'image/png',
    imageSize: 49000,
    imageDataUrl: createSampleProductMockup('SPITFIRE MK IX', 'VICKERS-ARMSTRONG MERLIN 61 SCHEMATIC', 'civil_war').dataUrl,
    mode: 'full',
    status: 'completed'
  }
];
