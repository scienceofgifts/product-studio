/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductDetailsInput } from '../types';
import { createSampleProductMockup } from '../utils/imageUtils';

export interface SampleProductItem {
  id: string;
  name: string;
  niche: string;
  details: ProductDetailsInput;
  mockup: {
    base64: string;
    dataUrl: string;
    mimeType: string;
    fileName: string;
    size: number;
  };
}

export const SAMPLE_PRODUCTS: SampleProductItem[] = [
  {
    id: 'sample-viking-mug',
    name: 'Lindisfarne 793 AD Chronicle Mug',
    niche: 'Viking History & Norse Culture',
    details: {
      workingName: 'Lindisfarne 793 AD Chronicle Ceramic Mug',
      productType: 'mug',
      giftGuideId: 'guide-viking-history',
      giftGuideName: 'The Definitive Gift Guide for Viking History & Norse Culture Enthusiasts',
      primaryRecipient: 'Serious student or reader of Norse medieval history who appreciates primary chronicle citations',
      secondaryRecipient: 'Re-enactor or Anglo-Saxon / Viking history podcast listener',
      audienceInterest: 'Anglo-Saxon Chronicles, 8th-century Northumbria, Viking expansion',
      occasion: 'Birthday or milestone academic gift',
      productUrl: 'https://shop.scienceofgifts.com/products/lindisfarne-793-mug',
      currentTitle: 'Viking Lindisfarne Raid 793 AD Coffee Mug',
      currentDescription: 'Ceramic 15oz mug with chronicle excerpt in Old English and translation detailing the sudden sea raiders at Holy Island.',
      productSpecs: '15 oz black ceramic, dishwasher and microwave safe, high-contrast matte print',
      knownDesignReferences: 'Excerpts from the Anglo-Saxon Chronicle (Manuscript D), authentic runic knotwork borders (Urnes style), no fantasy horns',
      initialPositioningIdea: 'An insider handshake for real history nerds who wince at cartoon Vikings and appreciate authentic 8th-century primary sources.',
      specificQuestions: 'How should the brief guide ChatGPT to frame the grim historical weight of 793 without turning into an insensitive joke?'
    },
    mockup: createSampleProductMockup('793 AD • LINDISFARNE', 'ANGLO-SAXON CHRONICLE FOLIO SPECIMEN', 'viking')
  },
  {
    id: 'sample-civil-war-tee',
    name: '20th Maine "Stand Firm" Joshua Chamberlain Tee',
    niche: 'American Civil War',
    details: {
      workingName: '20th Maine "Stand Firm" Regimental Graphic Tee',
      productType: 't-shirt',
      giftGuideId: 'guide-civil-war',
      giftGuideName: 'Thoughtful Gifts for American Civil War Buffs & Battlefield Visitors',
      primaryRecipient: 'Battlefield tourist, Gettysburg enthusiast, or military history reader who admires tactical discipline and the Little Round Top bayonet charge',
      secondaryRecipient: 'History teacher or Civil War roundtable member',
      audienceInterest: 'Battle of Gettysburg, Col. Joshua Lawrence Chamberlain, regimental tactical maps',
      occasion: 'Father’s Day, holiday, or post-battlefield trip present',
      productUrl: 'https://shop.scienceofgifts.com/products/20th-maine-tee',
      currentTitle: '20th Maine Little Round Top Civil War T-Shirt',
      currentDescription: 'Vintage-washed navy graphic tee featuring an accurate topographic contour of Little Round Top and the 20th Maine regimental badge.',
      productSpecs: '100% ring-spun combed cotton, vintage washed ink navy, water-based breathable screenprint',
      knownDesignReferences: 'G.K. Warren 1863 topographical survey map, Maltese cross of the V Corps',
      initialPositioningIdea: 'A subtle, wearable homage that prioritizes cartographic accuracy over loud patriotic or partisan sloganry.',
      specificQuestions: 'Can we highlight why the gift buyer can trust this tee not to look cheap or touristy?'
    },
    mockup: createSampleProductMockup('20TH MAINE • JULY 2 1863', 'LITTLE ROUND TOP TOPOGRAPHICAL CONTOUR', 'civil_war')
  },
  {
    id: 'sample-odyssey-notebook',
    name: "Penelope's Loom & The Odyssey Hardcover Journal",
    niche: 'Classics & Literature',
    details: {
      workingName: "Penelope's Loom & The Odyssey Hardcover Journal",
      productType: 'notebook',
      giftGuideId: 'guide-ancient-greece',
      giftGuideName: 'Classical Antiquity: Gifts for Greek Mythology & Philosophy Lovers',
      primaryRecipient: 'Literature student, translator, or writer fascinated by epic poetry, narrative craft, and Penelope’s agency in Ithaca',
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
    mockup: createSampleProductMockup('PENELOPE’S LOOM', 'HOMER • ODYSSEY BOOK II • ITHACA', 'odyssey')
  }
];
