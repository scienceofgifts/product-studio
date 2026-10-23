/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StructuredProductFacts, ProductFactItem, FactProvenance } from '../types/productFacts';
import { ChatGPTWritingBrief, ProductType } from '../types';

/**
 * Known legacy multi-product template strings from shared context profiles that must NEVER
 * be treated as verified physical specifications for any individual product.
 */
const LEGACY_MULTI_PRODUCT_SPEC_PATTERNS: RegExp[] = [
  /dishwasher\s*(?:&|and)\s*microwave\s+safe\s+ceramic\s+or\s+ring-spun\s+cotton/i,
  /comfortable\s+premium\s+cotton\s+apparel\s+or\s+heavy-duty\s+ceramic\s+drinkware/i,
  /archival\s+paper\s+notebook\s+with\s+smyth-sewn\s+binding\s+or\s+matte\s+ceramic\s+mug/i,
  /technical\s+blueprint-grade\s+linework\s+reproduction,\s*heavy\s+museum-grade\s+cardstock\s+or\s+premium\s+apparel/i,
  /matte\s+black\s+anti-reflective\s+finishes,\s*clean\s+graphic\s+lines,\s*durable\s+materials\s+designed\s+for\s+set\s+life/i,
  /\b(?:ceramic|mug|drinkware)\b.*\bor\b.*\b(?:cotton|apparel|hoodie|t-shirt|sweatshirt|notebook|paper)\b/i,
  /\b(?:cotton|apparel|hoodie|t-shirt|sweatshirt|notebook|paper|cardstock)\b.*\bor\b.*\b(?:ceramic|mug|drinkware|apparel)\b/i,
];

/**
 * Editorial, research, or marketing assertions that are NOT physical product specifications.
 */
const NON_PHYSICAL_EDITORIAL_CLAIM_PATTERNS: RegExp[] = [
  /\bhistorical\s+accuracy\s+checked\b/i,
  /\bhistorically\s+accurate\b/i,
  /\bscholarly\s+accuracy\s+(?:checked|verified)\b/i,
  /\bprimary\s+source\s+verified\b/i,
  /\barchival\s+matte\s+inks?\b/i,
];

const APPAREL_TYPES = new Set(['t-shirt', 'hoodie', 'sweatshirt']);
const DRINKWARE_TYPES = new Set(['mug', 'drinkware']);

/**
 * Checks whether a single specification clause is compatible with the given productType
 * and is a genuine physical specification rather than a legacy multi-product template
 * or non-physical editorial note.
 */
export function isSpecClauseCompatibleWithProductType(
  clause: string,
  productType?: ProductType | string
): {
  valid: boolean;
  reason?: 'empty' | 'legacy_template' | 'non_physical_editorial' | 'category_mismatch';
} {
  const trimmed = (clause || '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'none' || trimmed.toLowerCase() === 'none provided' || trimmed.toLowerCase() === 'unknown' || trimmed.toLowerCase() === 'unspecified') {
    return { valid: false, reason: 'empty' };
  }

  for (const pattern of LEGACY_MULTI_PRODUCT_SPEC_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: 'legacy_template' };
    }
  }

  for (const pattern of NON_PHYSICAL_EDITORIAL_CLAIM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: 'non_physical_editorial' };
    }
  }

  const normalizedType = (productType || '').trim().toLowerCase();
  if (!normalizedType) {
    return { valid: true };
  }

  // Category-specific incompatibilities
  const hasCeramicOrDrinkwareTerms =
    /\b(dishwasher|microwave|ceramic|stoneware|porcelain|mug|tumbler|pint\s+glass|lead-free\s+glaze|vacuum\s+insulated|stainless\s+steel|hot\s+liquid|beverage\s+capacity)\b/i.test(trimmed) ||
    /\b(11|12|15|16|20)\s*oz\b(?!\s*(?:fabric|fleece|cotton|denim|canvas))/i.test(trimmed);

  const hasApparelTerms =
    /\b(ring-spun|combed\s+cotton|carded\s+cotton|fleece|polyester|garment|hoodie|t-shirt|sweatshirt|crewneck|pullover|kangaroo\s+pocket|pouch\s+pocket|drawcord|unisex\s+fit|relaxed\s+fit|classic\s+fit|slim\s+fit|oversized\s+fit|garment\s+fit|fabric\s+weight|fabric\s+composition|screen\s*print|screen\s+printed|direct-to-garment|\bdtg\b)\b/i.test(trimmed) ||
    /\b(?:s\s+through\s+3xl|xs\s+to\s+3xl|s\s+to\s+2xl|2xl|3xl|4xl|5xl)\b/i.test(trimmed);

  const hasStationeryTerms =
    /\b(ruled\s+pages|dot-grid|numbered\s+pages|smyth-sewn|fountain-pen|hardcover\s+journal|ribbon\s+marker|acid-free\s+cream\s+paper|expandable\s+back\s+pocket|linen-bound)\b/i.test(trimmed);

  const hasPosterCanvasTerms =
    /\b(gicl[eé]e|museum-grade\s+cotton\s+canvas|hanging\s+rails|wood\s+battens|18\s*x\s*24|24\s*x\s*36)\b/i.test(trimmed);

  const hasPhoneCaseTerms =
    /\b(polycarbonate|tpu\s+cushion|camera\s+cutout|clear\s+bumper|matte\s+black\s+bumper)\b/i.test(trimmed);

  if (APPAREL_TYPES.has(normalizedType)) {
    if (hasCeramicOrDrinkwareTerms || hasStationeryTerms || hasPosterCanvasTerms || hasPhoneCaseTerms) {
      return { valid: false, reason: 'category_mismatch' };
    }
    // T-shirts and crewneck sweatshirts do not have hoods, drawcords, or kangaroo pockets
    if ((normalizedType === 't-shirt' || normalizedType === 'sweatshirt') &&
        /\b(hood\s+construction|double-lined\s+hood|lined\s+hood|unlined\s+hood|drawcord|kangaroo\s+pocket|pouch\s+pocket)\b/i.test(trimmed)) {
      return { valid: false, reason: 'category_mismatch' };
    }
  } else if (DRINKWARE_TYPES.has(normalizedType)) {
    if (hasApparelTerms || hasStationeryTerms || hasPosterCanvasTerms || hasPhoneCaseTerms) {
      return { valid: false, reason: 'category_mismatch' };
    }
  } else if (normalizedType === 'notebook') {
    if (hasCeramicOrDrinkwareTerms || hasApparelTerms || hasPosterCanvasTerms || hasPhoneCaseTerms) {
      return { valid: false, reason: 'category_mismatch' };
    }
  } else if (normalizedType === 'poster') {
    if (hasCeramicOrDrinkwareTerms || hasApparelTerms || hasStationeryTerms || hasPhoneCaseTerms) {
      return { valid: false, reason: 'category_mismatch' };
    }
  } else if (normalizedType === 'phone-case') {
    if (hasCeramicOrDrinkwareTerms || hasApparelTerms || hasStationeryTerms || hasPosterCanvasTerms) {
      return { valid: false, reason: 'category_mismatch' };
    }
  } else if (normalizedType === 'other') {
    // 'other' covers decals, desk mats, pins, tote bags, caps — never ceramic mugs or hoodies
    if (hasCeramicOrDrinkwareTerms || hasStationeryTerms || hasPosterCanvasTerms || hasPhoneCaseTerms) {
      return { valid: false, reason: 'category_mismatch' };
    }
    if (/\b(hoodie|kangaroo\s+pocket|drawcord|s\s+through\s+3xl|2xl|3xl)\b/i.test(trimmed)) {
      return { valid: false, reason: 'category_mismatch' };
    }
  }

  return { valid: true };
}

/**
 * Splits a raw specification string into clauses, strips legacy multi-product templates,
 * separates non-physical editorial notes, and filters out clauses incompatible with productType.
 */
export function sanitizeProductSpecsInput(
  rawSpecs: string | undefined,
  productType?: ProductType | string
): {
  validSpecs: string[];
  rejectedEditorialNotes: string[];
  rejectedIncompatibleSpecs: string[];
  cleanedSpecsString: string;
} {
  if (!rawSpecs || !rawSpecs.trim()) {
    return {
      validSpecs: [],
      rejectedEditorialNotes: [],
      rejectedIncompatibleSpecs: [],
      cleanedSpecsString: ''
    };
  }

  const trimmedRaw = rawSpecs.trim();

  // First check if the entire string is a known legacy multi-product profile template
  for (const pattern of LEGACY_MULTI_PRODUCT_SPEC_PATTERNS) {
    if (pattern.test(trimmedRaw)) {
      // Split by semicolon to see if any editorial notes should be recorded as rejectedEditorialNotes
      const parts = trimmedRaw.split(';').map((s) => s.trim()).filter(Boolean);
      const editorialNotes: string[] = [];
      const incompatible: string[] = [];
      for (const part of parts) {
        if (NON_PHYSICAL_EDITORIAL_CLAIM_PATTERNS.some((p) => p.test(part))) {
          editorialNotes.push(part);
        } else {
          incompatible.push(part);
        }
      }
      return {
        validSpecs: [],
        rejectedEditorialNotes: editorialNotes,
        rejectedIncompatibleSpecs: incompatible,
        cleanedSpecsString: ''
      };
    }
  }

  // Split by semicolons first; if a segment has comma-separated clauses, evaluate clauses
  const semicolonSegments = trimmedRaw.split(';').map((s) => s.trim()).filter(Boolean);
  const validSpecs: string[] = [];
  const rejectedEditorialNotes: string[] = [];
  const rejectedIncompatibleSpecs: string[] = [];

  for (const segment of semicolonSegments) {
    const segCheck = isSpecClauseCompatibleWithProductType(segment, productType);
    if (segCheck.valid) {
      validSpecs.push(segment);
      continue;
    }

    if (segCheck.reason === 'non_physical_editorial') {
      rejectedEditorialNotes.push(segment);
    } else if (segCheck.reason !== 'empty') {
      rejectedIncompatibleSpecs.push(segment);
    }
  }

  return {
    validSpecs,
    rejectedEditorialNotes,
    rejectedIncompatibleSpecs,
    cleanedSpecsString: validSpecs.join(', ')
  };
}

/**
 * Sanitizes a StructuredProductFacts object against a target productType so that switching
 * product types or extracting facts never retains category-incompatible fields.
 */
export function sanitizeExtractedFactsForProductType(
  facts: StructuredProductFacts | undefined,
  targetProductType?: ProductType | string
): StructuredProductFacts | undefined {
  if (!facts) return undefined;

  const normalizedTarget = (targetProductType || facts.productType?.value || '').trim().toLowerCase();
  if (!normalizedTarget) return facts;

  // If the extracted facts came from a completely different product category (e.g. mug vs hoodie),
  // clear category-specific physical facts.
  const extractedType = (facts.productType?.value || '').trim().toLowerCase();
  if (extractedType && extractedType !== normalizedTarget) {
    const bothApparel = APPAREL_TYPES.has(extractedType) && APPAREL_TYPES.has(normalizedTarget);
    const bothDrinkware = DRINKWARE_TYPES.has(extractedType) && DRINKWARE_TYPES.has(normalizedTarget);
    if (!bothApparel && !bothDrinkware) {
      return undefined;
    }
  }

  const sanitized: StructuredProductFacts = { ...facts };

  if (sanitized.productType && normalizedTarget) {
    sanitized.productType = {
      ...sanitized.productType,
      value: normalizedTarget
    };
  }

  if (!APPAREL_TYPES.has(normalizedTarget)) {
    delete sanitized.fabricComposition;
    delete sanitized.fabricWeight;
    delete sanitized.fit;
    delete sanitized.hoodConstruction;
    delete sanitized.pocketType;
    if (sanitized.sizeRange?.value && /\b(xs|s|m|l|xl|2xl|3xl|4xl|5xl)\b/i.test(sanitized.sizeRange.value)) {
      delete sanitized.sizeRange;
    }
  } else if (normalizedTarget === 't-shirt' || normalizedTarget === 'sweatshirt') {
    delete sanitized.hoodConstruction;
    if (sanitized.pocketType?.value && /\b(kangaroo|pouch)\b/i.test(sanitized.pocketType.value)) {
      delete sanitized.pocketType;
    }
  }

  const checkFields: Array<keyof StructuredProductFacts> = [
    'color',
    'fabricComposition',
    'fabricWeight',
    'fit',
    'hoodConstruction',
    'pocketType',
    'sizeRange',
    'price'
  ];

  for (const key of checkFields) {
    const item = sanitized[key] as ProductFactItem | undefined;
    if (item && item.value) {
      const check = isSpecClauseCompatibleWithProductType(`${item.label}: ${item.value}`, normalizedTarget);
      if (!check.valid) {
        delete sanitized[key];
      }
    }
  }

  return sanitized;
}

/**
 * Validates and assembles the canonical list of Verified Physical Specifications for a product brief,
 * ensuring category compatibility and preventing unverified/ambiguous observations from being promoted
 * to verified specifications.
 */
export function validateAndBuildVerifiedSpecsList(params: {
  productType?: ProductType | string;
  productSpecs?: string;
  extractedFacts?: StructuredProductFacts;
  confirmedSpecifications?: string[];
  undeterminedInformation?: string[];
  potentialAmbiguities?: string[];
  missingInformation?: string[];
}): {
  verifiedSpecs: string[];
  movedToUncertainties: string[];
} {
  const {
    productType,
    productSpecs,
    extractedFacts,
    confirmedSpecifications = [],
    undeterminedInformation = [],
    potentialAmbiguities = [],
    missingInformation = []
  } = params;

  const verifiedSpecs: string[] = [];
  const movedToUncertainties: string[] = [];

  const sanitizedSpecs = sanitizeProductSpecsInput(productSpecs, productType);
  for (const s of sanitizedSpecs.validSpecs) {
    if (!verifiedSpecs.some((existing) => existing.toLowerCase() === s.toLowerCase())) {
      verifiedSpecs.push(s);
    }
  }
  for (const editorialNote of sanitizedSpecs.rejectedEditorialNotes) {
    const note = `Unverified editorial/production claim excluded from physical specifications: "${editorialNote}"`;
    if (!movedToUncertainties.includes(note)) {
      movedToUncertainties.push(note);
    }
  }

  const cleanFacts = sanitizeExtractedFactsForProductType(extractedFacts, productType);
  const explicitlyVerifiedKeys = new Set<string>();

  if (cleanFacts) {
    const factEntries: Array<{ key: keyof StructuredProductFacts; displayLabel: string }> = [
      { key: 'color', displayLabel: 'Color / Colorway' },
      { key: 'fabricComposition', displayLabel: 'Material / Fabric' },
      { key: 'fabricWeight', displayLabel: 'Fabric Weight' },
      { key: 'fit', displayLabel: 'Fit' },
      { key: 'hoodConstruction', displayLabel: 'Hood Construction' },
      { key: 'pocketType', displayLabel: 'Pocket Style' },
      { key: 'sizeRange', displayLabel: 'Sizes' },
      { key: 'price', displayLabel: 'Price' }
    ];

    for (const { key, displayLabel } of factEntries) {
      const item = cleanFacts[key] as ProductFactItem | undefined;
      if (item && item.value && item.value.trim() !== '' && item.value !== 'Unknown' && item.isVerified !== false) {
        if (key === 'price' && (item.value === '0' || item.value === '$0.00' || item.value.includes('0.00'))) {
          continue;
        }
        explicitlyVerifiedKeys.add(key);
        const formatted = `${displayLabel}: ${item.value.trim()}`;
        if (!verifiedSpecs.some((v) => v.toLowerCase().includes(item.value.trim().toLowerCase()) && v.toLowerCase().includes(displayLabel.split(' ')[0].toLowerCase()))) {
          verifiedSpecs.push(formatted);
        }
      }
    }
  }

  // Combine all uncertainty/ambiguity notices to prevent AI-hallucinated specs from leaking into verifiedSpecs
  const combinedUncertaintyText = [
    ...undeterminedInformation,
    ...potentialAmbiguities,
    ...missingInformation
  ].join(' \n ').toLowerCase();

  for (const rawConfirmed of confirmedSpecifications) {
    if (!rawConfirmed || !rawConfirmed.trim()) continue;
    // Strip provenance suffix like "[source-stated]" for compatibility check
    const withoutProv = rawConfirmed.replace(/\s*\[[^\]]+\]\s*$/, '').trim();
    const check = isSpecClauseCompatibleWithProductType(withoutProv, productType);
    if (!check.valid) {
      if (check.reason === 'non_physical_editorial') {
        const note = `Unverified claim excluded from physical specifications: "${withoutProv}"`;
        if (!movedToUncertainties.includes(note)) movedToUncertainties.push(note);
      }
      continue;
    }

    const lowerConfirmed = withoutProv.toLowerCase();

    // Do not duplicate Product Type if it's just restating "Product Type: hoodie"
    if (/^product\s+type\s*:\s*/i.test(withoutProv)) {
      continue;
    }

    // Check if this confirmed specification is actually flagged as undetermined/ambiguous and NOT in explicitlyVerifiedKeys or sanitizedSpecs
    const isBackedByUserSpecs = sanitizedSpecs.validSpecs.some((s) => lowerConfirmed.includes(s.toLowerCase()) || s.toLowerCase().includes(lowerConfirmed));
    if (!isBackedByUserSpecs) {
      if ((lowerConfirmed.includes('pocket') || lowerConfirmed.includes('kangaroo')) &&
          !explicitlyVerifiedKeys.has('pocketType') &&
          (combinedUncertaintyText.includes('pocket') || combinedUncertaintyText.includes('kangaroo'))) {
        const note = `Pocket construction (${withoutProv}) is unverified and must not be stated as a confirmed specification.`;
        if (!movedToUncertainties.includes(note)) movedToUncertainties.push(note);
        continue;
      }
      if ((lowerConfirmed.includes('gsm') || lowerConfirmed.includes('fabric weight') || lowerConfirmed.includes('fleece weight')) &&
          !explicitlyVerifiedKeys.has('fabricWeight') &&
          (combinedUncertaintyText.includes('gsm') || combinedUncertaintyText.includes('weight'))) {
        const note = `Fabric weight (${withoutProv}) is unverified and must not be stated as a confirmed specification.`;
        if (!movedToUncertainties.includes(note)) movedToUncertainties.push(note);
        continue;
      }
      if ((lowerConfirmed.includes('cotton') || lowerConfirmed.includes('polyester') || lowerConfirmed.includes('blend') || lowerConfirmed.includes('fabric composition')) &&
          !explicitlyVerifiedKeys.has('fabricComposition') &&
          (combinedUncertaintyText.includes('blend') || combinedUncertaintyText.includes('composition') || combinedUncertaintyText.includes('fabric') || combinedUncertaintyText.includes('material'))) {
        const note = `Fabric composition (${withoutProv}) is unverified and must not be stated as a confirmed specification.`;
        if (!movedToUncertainties.includes(note)) movedToUncertainties.push(note);
        continue;
      }
    }

    // Deduplicate against already added verifiedSpecs
    const valPart = withoutProv.includes(':') ? withoutProv.split(':').slice(1).join(':').trim().toLowerCase() : lowerConfirmed;
    const alreadyPresent = verifiedSpecs.some((existing) => {
      const lowerExisting = existing.toLowerCase();
      return lowerExisting === lowerConfirmed || (valPart.length > 2 && lowerExisting.includes(valPart));
    });

    if (!alreadyPresent) {
      verifiedSpecs.push(withoutProv);
    }
  }

  return { verifiedSpecs, movedToUncertainties };
}

/**
 * Parses raw HTML (including JSON-LD, OpenGraph, and meta tags) to extract structured product facts.
 */
export function parseProductFactsFromHtml(html: string, sourceUrl: string): StructuredProductFacts {
  let title = '';
  let description = '';
  let priceRange = '';
  let sizesFromOffers: string[] = [];
  let colorsFromOffers: string[] = [];

  // 1. Extract JSON-LD script if available
  const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const productObj = Array.isArray(parsed)
        ? parsed.find((item) => item['@type'] === 'Product')
        : parsed['@type'] === 'Product'
        ? parsed
        : null;

      if (productObj) {
        if (productObj.name) title = String(productObj.name).trim();
        if (productObj.description) description = String(productObj.description).trim();

        if (Array.isArray(productObj.offers)) {
          const prices: number[] = [];
          productObj.offers.forEach((offer: any) => {
            if (offer.price) {
              const p = parseFloat(offer.price);
              if (!isNaN(p)) prices.push(p);
            }
            if (offer.name) {
              const parts = String(offer.name).split(',').map((s) => s.trim());
              parts.forEach((part) => {
                if (['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', 'XS'].includes(part.toUpperCase())) {
                  sizesFromOffers.push(part.toUpperCase());
                } else if (part.length > 1 && !part.startsWith('http')) {
                  colorsFromOffers.push(part);
                }
              });
            }
          });

          if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            priceRange = minPrice === maxPrice ? `$${minPrice.toFixed(2)}` : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
          }
        }
      }
    } catch {
      // Ignore JSON parse errors in invalid scripts
    }
  }

  // 2. Fallback to OpenGraph and Meta tags if missing
  if (!title) {
    const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    if (ogTitle) title = ogTitle[1].trim();
    else {
      const titleTag = html.match(/<title>([^<]+)<\/title>/i);
      if (titleTag) title = titleTag[1].replace(/\|.*/, '').trim();
    }
  }

  if (!description) {
    const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    if (ogDesc) description = ogDesc[1].trim();
    else {
      const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      if (metaDesc) description = metaDesc[1].trim();
    }
  }

  if (!priceRange) {
    const ogPrice = html.match(/<meta\s+property=["']og:price:amount["']\s+content=["']([^"']+)["']/i);
    const ogCurrency = html.match(/<meta\s+property=["']og:price:currency["']\s+content=["']([^"']+)["']/i) || [, 'USD'];
    if (ogPrice) {
      priceRange = `$${parseFloat(ogPrice[1]).toFixed(2)} ${ogCurrency[1]}`;
    }
  }

  const combinedText = `${title}\n${description}`;
  const sourceRef = `Extracted from product page metadata (${new URL(sourceUrl).hostname})`;

  // Helper for fact item creation
  const createFact = (id: string, label: string, value: string, prov: FactProvenance = 'source-stated'): ProductFactItem => ({
    id,
    label,
    value: value.trim(),
    provenance: prov,
    sourceRef,
    isVerified: true
  });

  // 3. Deterministic Fact Extraction
  let productType: ProductFactItem | undefined;
  let color: ProductFactItem | undefined;
  let fabricComposition: ProductFactItem | undefined;
  let fabricWeight: ProductFactItem | undefined;
  let fit: ProductFactItem | undefined;
  let hoodConstruction: ProductFactItem | undefined;
  let pocketType: ProductFactItem | undefined;
  let sizeRange: ProductFactItem | undefined;
  let artworkDescription: ProductFactItem | undefined;

  // Product Type
  const lowerText = combinedText.toLowerCase();
  let detectedType: ProductType | undefined;
  if (lowerText.includes('hoodie') || lowerText.includes('pullover')) {
    detectedType = 'hoodie';
    productType = createFact('productType', 'Product Type', 'hoodie');
  } else if (lowerText.includes('t-shirt') || lowerText.includes(' tee ') || lowerText.includes('tshirt')) {
    detectedType = 't-shirt';
    productType = createFact('productType', 'Product Type', 't-shirt');
  } else if (lowerText.includes('sweatshirt')) {
    detectedType = 'sweatshirt';
    productType = createFact('productType', 'Product Type', 'sweatshirt');
  } else if (lowerText.includes('mug')) {
    detectedType = 'mug';
    productType = createFact('productType', 'Product Type', 'mug');
  } else if (lowerText.includes('tumbler') || lowerText.includes('pint glass')) {
    detectedType = 'drinkware';
    productType = createFact('productType', 'Product Type', 'drinkware');
  } else if (lowerText.includes('journal') || lowerText.includes('notebook')) {
    detectedType = 'notebook';
    productType = createFact('productType', 'Product Type', 'notebook');
  } else if (lowerText.includes('poster') || lowerText.includes('canvas')) {
    detectedType = 'poster';
    productType = createFact('productType', 'Product Type', 'poster');
  }

  const isApparel = !detectedType || APPAREL_TYPES.has(detectedType);

  // Color
  const colorMatch = combinedText.match(/\b(cobalt(?:\s+blue)?|navy(?:\s+blue)?|forest\s+green|charcoal|heather\s+grey|black|white|cream|maroon|burgundy|royal\s+blue)\b/i);
  if (colorMatch) {
    color = createFact('color', 'Color / Colorway', colorMatch[1]);
  } else if (colorsFromOffers.length > 0) {
    color = createFact('color', 'Color / Colorway', Array.from(new Set(colorsFromOffers)).join(', '));
  }

  if (isApparel) {
    // Fabric Composition (Apparel only)
    const compMatch = combinedText.match(/(\d+%\s*[\w\s\/]+(?:\s+and|\s*,\s*)\s*\d+%\s*[\w\s\/]+(?:\s+fleece|\s+cotton|\s+polyester|\s+blend)?|\b100%\s+[\w\s]+cotton)/i);
    if (compMatch) {
      fabricComposition = createFact('fabricComposition', 'Fabric Composition', compMatch[1]);
    }

    // Fabric Weight (Apparel only; avoid matching 11oz / 15oz mug capacity!)
    const weightMatch = combinedText.match(/((?:heavyweight|midweight|lightweight)\s+\d+(?:\.\d+)?\s*oz(?:\s*fabric)?|\d+(?:\.\d+)?\s*oz\s+(?:fabric|fleece|cotton)|\d+\s*gsm)/i);
    if (weightMatch) {
      fabricWeight = createFact('fabricWeight', 'Fabric Weight', weightMatch[1]);
    }

    // Fit (Apparel only)
    const fitMatch = combinedText.match(/((?:relaxed|classic|slim|oversized|unisex|regular)\s+fit(?:\s+with\s+[\w\s]+)?)/i);
    if (fitMatch) {
      fit = createFact('fit', 'Garment Fit', fitMatch[1]);
    }

    // Hood Construction (Hoodies only)
    if (!detectedType || detectedType === 'hoodie') {
      const hoodMatch = combinedText.match(/((?:lined|unlined|double-lined)?\s*hood\s+with\s+(?:no|without)\s+drawcord|\blined\s+hood\b)/i);
      if (hoodMatch) {
        hoodConstruction = createFact('hoodConstruction', 'Hood Construction', hoodMatch[1]);
      }
    }

    // Pocket Type (Apparel only, and only if not preceded by uncertainty/negation)
    const pocketMatch = combinedText.match(/(?<!(?:no|without|whether\s+a|unconfirmed)\s+)((?:front\s+)?kangaroo\s+pocket|pouch\s+pocket|side\s+pockets|chest\s+pocket)/i);
    if (pocketMatch) {
      pocketType = createFact('pocketType', 'Pocket Style', pocketMatch[1]);
    }

    // Size Range (Apparel only)
    const sizeMatch = combinedText.match(/(sizes?\s+runs?\s+from\s+[A-Z0-9]+\s+to\s+[A-Z0-9]+|sizes?\s+from\s+[A-Z0-9]+\s+through\s+[A-Z0-9]+|S\s+through\s+3XL|XS\s+to\s+3XL)/i);
    if (sizeMatch) {
      sizeRange = createFact('sizeRange', 'Available Size Range', sizeMatch[1]);
    } else if (sizesFromOffers.length > 0) {
      const uniqueSizes = Array.from(new Set(sizesFromOffers));
      sizeRange = createFact('sizeRange', 'Available Size Range', `${uniqueSizes[0]} through ${uniqueSizes[uniqueSizes.length - 1]}`);
    }
  }

  // Artwork Description
  const artworkParagraphs = description
    .split('\n')
    .filter((p) => p.includes('print') || p.includes('emblem') || p.includes('crest') || p.includes('insignia') || p.includes('artwork') || p.includes('graphic'));
  if (artworkParagraphs.length > 0) {
    artworkDescription = createFact('artworkDescription', 'Artwork & Motif Description', artworkParagraphs.join(' '));
  }

  const priceFact = priceRange ? createFact('price', 'Price / Pricing Structure', priceRange) : undefined;

  const retrievalStatus = (productType || fabricComposition || fabricWeight || fit || color || priceFact) ? 'success' : 'partial';

  return {
    retrievalStatus,
    retrievedAt: new Date().toISOString(),
    sourceUrl,
    rawExtractedTitle: title,
    rawExtractedDescription: description,
    productType,
    color,
    fabricComposition,
    fabricWeight,
    fit,
    hoodConstruction,
    pocketType,
    sizeRange,
    artworkDescription,
    price: priceFact
  };
}

/**
 * Fetches a product page URL safely from server/worker.
 */
export async function fetchAndExtractProductFacts(url: string): Promise<StructuredProductFacts> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('URL must start with http:// or https://');
    }
  } catch (err: any) {
    return {
      retrievalStatus: 'failed',
      sourceUrl: url,
      retrievalError: err.message || 'Invalid URL format provided.'
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout

    const response = await fetch(parsedUrl.href, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        retrievalStatus: 'failed',
        sourceUrl: url,
        retrievalError: `HTTP Error ${response.status}: ${response.statusText}`
      };
    }

    const html = await response.text();
    if (!html || html.length < 100) {
      return {
        retrievalStatus: 'failed',
        sourceUrl: url,
        retrievalError: 'Retrieved page was empty or contained insufficient HTML content.'
      };
    }

    return parseProductFactsFromHtml(html, url);
  } catch (err: any) {
    return {
      retrievalStatus: 'failed',
      sourceUrl: url,
      retrievalError: err.name === 'AbortError' ? 'Product page fetch timed out after 9 seconds.' : (err.message || 'Network request failed.')
    };
  }
}

/**
 * Merges extracted facts with manual user overrides.
 * Manual overrides take precedence and carry provenance: 'user-provided'.
 */
export function mergeProductFacts(
  extracted: StructuredProductFacts | undefined,
  userOverrides: Partial<Record<string, string>>,
  targetProductType?: ProductType | string
): StructuredProductFacts {
  const base: StructuredProductFacts = sanitizeExtractedFactsForProductType(extracted, targetProductType) || {
    retrievalStatus: 'unattempted'
  };

  const fields: Array<keyof StructuredProductFacts> = [
    'productType',
    'color',
    'fabricComposition',
    'fabricWeight',
    'fit',
    'hoodConstruction',
    'pocketType',
    'sizeRange',
    'artworkDescription',
    'price'
  ];

  const updated: StructuredProductFacts = { ...base };

  fields.forEach((fieldKey) => {
    const userVal = userOverrides[fieldKey];
    if (userVal !== undefined && userVal.trim() !== '') {
      const existingItem = base[fieldKey] as ProductFactItem | undefined;
      (updated as any)[fieldKey] = {
        id: fieldKey,
        label: existingItem?.label || fieldKey,
        value: userVal.trim(),
        provenance: 'user-provided',
        isVerified: true,
        sourceRef: 'Manually entered / confirmed by user',
        originalSourceValue: existingItem?.value !== userVal ? existingItem?.value : undefined
      };
    }
  });

  return sanitizeExtractedFactsForProductType(updated, targetProductType) || updated;
}

/**
 * Formats structured product facts into explicit prompt context for Gemini writer model.
 */
export function formatProductFactsForWriter(
  facts: StructuredProductFacts | undefined,
  targetProductType?: ProductType | string
): string {
  const cleanFacts = sanitizeExtractedFactsForProductType(facts, targetProductType);
  if (!cleanFacts) {
    return `
PRODUCT FACTS FOR THE WRITER:
No retrieved product facts available. Rely strictly on visual observations from the image and explicitly provided user inputs that are valid for product type "${targetProductType || 'unspecified'}". Do NOT invent missing material specs, fabric weights, or construction details, and NEVER include specifications belonging to other product types (such as ceramic/dishwasher specs on apparel, or cotton/fleece specs on drinkware).
`;
  }

  const items: ProductFactItem[] = [];
  const fieldKeys: Array<keyof StructuredProductFacts> = [
    'productType',
    'color',
    'fabricComposition',
    'fabricWeight',
    'fit',
    'hoodConstruction',
    'pocketType',
    'sizeRange',
    'artworkDescription',
    'price'
  ];

  fieldKeys.forEach((k) => {
    const item = cleanFacts[k] as ProductFactItem | undefined;
    if (item && item.value && item.value !== 'Unknown') {
      if (k === 'price' && (!item.value || item.value === 'Unknown' || item.value === '0' || item.value === '$0.00' || item.value.includes('0.00'))) {
        return;
      }
      items.push(item);
    }
  });

  // Deduplicate items by label and value
  const seen = new Set<string>();
  const uniqueItems = items.filter((i) => {
    const key = `${i.label.toLowerCase()}:${i.value.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const formattedLines = uniqueItems.map((i) => {
    const provTag = `[Provenance: ${i.provenance}]`;
    const srcNote = i.sourceRef ? ` (${i.sourceRef})` : '';
    const conflictNote = i.originalSourceValue ? ` [Note: User overridden from original source value "${i.originalSourceValue}"]` : '';
    return `- ${i.label}: "${i.value}" ${provTag}${srcNote}${conflictNote}`;
  });

  return `
PRODUCT FACTS FOR THE WRITER (FACTUAL BASELINE):
Retrieval Status: ${cleanFacts.retrievalStatus} (Source: ${cleanFacts.sourceUrl || 'Unspecified'})

CONFIRMED SPECIFICATIONS & PROVENANCE:
${formattedLines.length > 0 ? formattedLines.join('\n') : '- None verified. Do not invent specifications.'}

WRITER INSTRUCTIONS FOR PRODUCT FACTS:
1. Use ONLY the supplied product facts above that are compatible with product type "${targetProductType || cleanFacts.productType?.value || 'unspecified'}" as the factual basis for the brief and resulting entry.
2. Distinguish source-stated claims, user-provided information, and visual observations.
3. Do NOT invent missing specifications, embellish product features (e.g. do NOT claim a pocket is "deep" if the page only specifies "front kangaroo pocket"), or claim that seller-stated information has been independently verified.
4. NEVER include specifications from unrelated product types (e.g., never mention ceramic, dishwasher, or microwave safety on a hoodie/apparel item; never mention fabric weight, GSM, cotton, or kangaroo pockets on a ceramic mug).
5. If a relevant fact is marked "Unknown" or omitted, keep it explicitly in missingInformationDoNotInvent / factsRequiringVerification—NEVER manufacture neutral or filler values.
`;
}

/**
 * Reconciles the generated ChatGPT writing brief with known facts and productType to eliminate
 * cross-product specification contamination and contradictions.
 */
export function reconcileWritingBriefWithFacts(
  brief: ChatGPTWritingBrief,
  facts: StructuredProductFacts | undefined,
  targetProductType?: ProductType | string,
  rawProductSpecs?: string
): ChatGPTWritingBrief {
  if (!brief) return brief;

  const reconciled = { ...brief };
  const effectiveType = (targetProductType || reconciled.productIdentity?.productType || facts?.productType?.value || '').trim().toLowerCase();
  const cleanFacts = sanitizeExtractedFactsForProductType(facts, effectiveType);
  const sanitizedUserSpecs = sanitizeProductSpecsInput(rawProductSpecs, effectiveType);

  // Sanitize productIdentity.suppliedSpecifications
  if (reconciled.productIdentity) {
    const suppliedCheck = sanitizeProductSpecsInput(reconciled.productIdentity.suppliedSpecifications, effectiveType);
    reconciled.productIdentity = {
      ...reconciled.productIdentity,
      productType: effectiveType || reconciled.productIdentity.productType,
      suppliedSpecifications: suppliedCheck.cleanedSpecsString || sanitizedUserSpecs.cleanedSpecsString || 'None supplied'
    };
  }

  // Filter existing confirmedSpecifications in the brief for productType compatibility
  const rawConfirmedList: string[] = [
    ...sanitizedUserSpecs.validSpecs,
    ...(reconciled.confirmedSpecifications || [])
  ];

  const filteredConfirmed: string[] = [];
  const rejectedToVerification: string[] = [...sanitizedUserSpecs.rejectedEditorialNotes];

  for (const spec of rawConfirmedList) {
    const withoutProv = spec.replace(/\s*\[[^\]]+\]\s*$/, '').trim();
    const check = isSpecClauseCompatibleWithProductType(withoutProv, effectiveType);
    if (check.valid) {
      if (!filteredConfirmed.some((c) => c.toLowerCase() === spec.trim().toLowerCase())) {
        filteredConfirmed.push(spec.trim());
      }
    } else if (check.reason === 'non_physical_editorial') {
      if (!rejectedToVerification.includes(withoutProv)) {
        rejectedToVerification.push(withoutProv);
      }
    }
  }

  if (cleanFacts) {
    const fieldKeys: Array<keyof StructuredProductFacts> = [
      'productType',
      'color',
      'fabricComposition',
      'fabricWeight',
      'fit',
      'hoodConstruction',
      'pocketType',
      'sizeRange',
      'price'
    ];

    fieldKeys.forEach((k) => {
      const item = cleanFacts[k] as ProductFactItem | undefined;
      if (item && item.value && item.value !== 'Unknown') {
        const specLine = `${item.label}: ${item.value} [${item.provenance}]`;
        if (!filteredConfirmed.some((c) => c.toLowerCase().includes(item.label.toLowerCase()))) {
          filteredConfirmed.push(specLine);
        }
      }
    });
  }

  reconciled.confirmedSpecifications = Array.from(new Set(filteredConfirmed));

  // Also filter productEditorialReasoning.verifiedFactsToInclude for productType compatibility
  if (reconciled.productEditorialReasoning?.verifiedFactsToInclude) {
    reconciled.productEditorialReasoning = {
      ...reconciled.productEditorialReasoning,
      verifiedFactsToInclude: reconciled.productEditorialReasoning.verifiedFactsToInclude.filter(
        (fact) => isSpecClauseCompatibleWithProductType(fact, effectiveType).valid
      )
    };
  }

  // Route any non-physical editorial claims into factsRequiringVerification
  if (rejectedToVerification.length > 0) {
    const existingVer = new Set(reconciled.factsRequiringVerification || []);
    for (const note of rejectedToVerification) {
      existingVer.add(`Verify editorial/production claim separately from physical specs: "${note}"`);
    }
    reconciled.factsRequiringVerification = Array.from(existingVer);
  }

  // Perform deterministic Factual Quality Audit check
  if (reconciled.editorialQualityAudit && reconciled.sampleEditorialEntry) {
    const text = reconciled.sampleEditorialEntry;
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const hasEmDash = text.includes('—') || text.includes(' -- ');
    const hasGenericOpening = /looking for the perfect gift|searching for something special|must-have|guaranteed to impress/i.test(text);
    const hasUnsupportedLifestyle = /archival reading rooms|long grading sessions|weekend museum visits/i.test(text);
    const hasCrossCategoryContamination = !isSpecClauseCompatibleWithProductType(text, effectiveType).valid;

    const lengthPassed = wordCount >= 180 && wordCount <= 240;
    const naturalnessPassed = !hasEmDash && !hasGenericOpening && !hasUnsupportedLifestyle && !hasCrossCategoryContamination;

    reconciled.editorialQualityAudit.naturalness = naturalnessPassed;
    reconciled.editorialQualityAudit.factualIntegrity = !hasGenericOpening && !hasUnsupportedLifestyle && !hasCrossCategoryContamination;
    reconciled.editorialQualityAudit.passed = lengthPassed && naturalnessPassed && (reconciled.editorialQualityAudit.specificity ?? true);

    if (!lengthPassed) {
      reconciled.editorialQualityAudit.notes = `Word count audit failed: ${wordCount} words (Required range: 180–240 words, target 210).`;
    } else if (hasCrossCategoryContamination) {
      reconciled.editorialQualityAudit.notes = `Factual integrity audit failed: sample entry contains specifications incompatible with product type "${effectiveType}".`;
    } else if (!naturalnessPassed) {
      reconciled.editorialQualityAudit.notes = `Naturalness / factual integrity audit failed: contains em-dashes, generic openings, or unsupported lifestyle assumptions.`;
    } else {
      reconciled.editorialQualityAudit.notes = `Passed all deterministic and editorial checks (${wordCount} words).`;
    }
  }

  // Clean missingInformationDoNotInvent: remove items that are actually KNOWN in cleanFacts!
  if (reconciled.missingInformationDoNotInvent && cleanFacts) {
    reconciled.missingInformationDoNotInvent = reconciled.missingInformationDoNotInvent.filter((notice) => {
      const lower = notice.toLowerCase();
      if (cleanFacts.fabricWeight?.value && cleanFacts.fabricWeight.value !== 'Unknown' && (lower.includes('weight') || lower.includes('fleece weight'))) {
        return false;
      }
      if (cleanFacts.fabricComposition?.value && cleanFacts.fabricComposition.value !== 'Unknown' && (lower.includes('fabric') || lower.includes('composition') || lower.includes('material'))) {
        return false;
      }
      if (cleanFacts.pocketType?.value && cleanFacts.pocketType.value !== 'Unknown' && lower.includes('pocket')) {
        return false;
      }
      if (cleanFacts.sizeRange?.value && cleanFacts.sizeRange.value !== 'Unknown' && lower.includes('size')) {
        return false;
      }
      return true;
    });
  }

  // Clean factsRequiringVerification similarly
  if (reconciled.factsRequiringVerification && cleanFacts) {
    reconciled.factsRequiringVerification = reconciled.factsRequiringVerification.filter((fact) => {
      const lower = fact.toLowerCase();
      if (cleanFacts.fabricWeight?.value && cleanFacts.fabricWeight.value !== 'Unknown' && lower.includes('weight')) {
        return false;
      }
      if (cleanFacts.fabricComposition?.value && cleanFacts.fabricComposition.value !== 'Unknown' && lower.includes('composition')) {
        return false;
      }
      return true;
    });
  }

  // Ensure claimsAndAssumptionsToAvoid includes category-appropriate guards
  const claimsToAvoid = [...(reconciled.claimsAndAssumptionsToAvoid || [])];
  if (APPAREL_TYPES.has(effectiveType)) {
    if (effectiveType === 'hoodie' && !claimsToAvoid.some((c) => c.includes('kangaroo pocket'))) {
      claimsToAvoid.push('Do not embellish "front kangaroo pocket" as "deep pouch pocket" without physical testing, or claim a pocket exists unless verified.');
    }
    if (!claimsToAvoid.some((c) => c.toLowerCase().includes('ceramic') || c.toLowerCase().includes('dishwasher'))) {
      claimsToAvoid.push('Do not include ceramic, drinkware, dishwasher, or microwave specifications on apparel products.');
    }
  }
  reconciled.claimsAndAssumptionsToAvoid = claimsToAvoid;

  return reconciled;
}
