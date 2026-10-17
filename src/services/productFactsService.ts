/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StructuredProductFacts, ProductFactItem, FactProvenance } from '../types/productFacts';
import { ChatGPTWritingBrief } from '../types';

/**
 * Parses raw HTML (including JSON-LD, OpenGraph, and meta tags) to extract structured product facts.
 */
export function parseProductFactsFromHtml(html: string, sourceUrl: string): StructuredProductFacts {
  let title = '';
  let description = '';
  let priceRange = '';
  let sizesFromOffers: string[] = [];
  let colorsFromOffers: string[] = [];
  let brandName = '';

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
        if (productObj.brand?.name) brandName = String(productObj.brand.name).trim();

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
  if (lowerText.includes('hoodie') || lowerText.includes('pullover')) {
    productType = createFact('productType', 'Product Type', 'hoodie');
  } else if (lowerText.includes('t-shirt') || lowerText.includes(' tee ') || lowerText.includes('tshirt')) {
    productType = createFact('productType', 'Product Type', 't-shirt');
  } else if (lowerText.includes('sweatshirt')) {
    productType = createFact('productType', 'Product Type', 'sweatshirt');
  } else if (lowerText.includes('mug')) {
    productType = createFact('productType', 'Product Type', 'mug');
  } else if (lowerText.includes('journal') || lowerText.includes('notebook')) {
    productType = createFact('productType', 'Product Type', 'notebook');
  } else if (lowerText.includes('poster') || lowerText.includes('canvas')) {
    productType = createFact('productType', 'Product Type', 'poster');
  }

  // Color
  const colorMatch = combinedText.match(/\b(cobalt(?:\s+blue)?|navy(?:\s+blue)?|forest\s+green|charcoal|heather\s+grey|black|white|cream|maroon|burgundy|royal\s+blue)\b/i);
  if (colorMatch) {
    color = createFact('color', 'Color / Colorway', colorMatch[1]);
  } else if (colorsFromOffers.length > 0) {
    color = createFact('color', 'Color / Colorway', Array.from(new Set(colorsFromOffers)).join(', '));
  }

  // Fabric Composition
  const compMatch = combinedText.match(/(\d+%\s*[\w\s\/]+(?:\s+and|\s*,\s*)\s*\d+%\s*[\w\s\/]+(?:\s+fleece|\s+cotton|\s+polyester|\s+blend)?|\b100%\s+[\w\s]+cotton)/i);
  if (compMatch) {
    fabricComposition = createFact('fabricComposition', 'Fabric Composition', compMatch[1]);
  }

  // Fabric Weight
  const weightMatch = combinedText.match(/((?:heavyweight|midweight|lightweight)?\s*\d+(?:\.\d+)?\s*oz(?:\s*fabric)?|\d+\s*gsm)/i);
  if (weightMatch) {
    fabricWeight = createFact('fabricWeight', 'Fabric Weight', weightMatch[1]);
  }

  // Fit
  const fitMatch = combinedText.match(/((?:relaxed|classic|slim|oversized|unisex|regular)\s+fit(?:\s+with\s+[\w\s]+)?)/i);
  if (fitMatch) {
    fit = createFact('fit', 'Garment Fit', fitMatch[1]);
  }

  // Hood Construction
  const hoodMatch = combinedText.match(/((?:lined|unlined|double-lined)?\s*hood\s+with\s+(?:no|without)\s+drawcord|\blined\s+hood\b)/i);
  if (hoodMatch) {
    hoodConstruction = createFact('hoodConstruction', 'Hood Construction', hoodMatch[1]);
  }

  // Pocket Type
  const pocketMatch = combinedText.match(/((?:front\s+)?kangaroo\s+pocket|pouch\s+pocket|side\s+pockets|chest\s+pocket)/i);
  if (pocketMatch) {
    pocketType = createFact('pocketType', 'Pocket Style', pocketMatch[1]);
  }

  // Size Range
  const sizeMatch = combinedText.match(/(sizes?\s+runs?\s+from\s+[A-Z0-9]+\s+to\s+[A-Z0-9]+|sizes?\s+from\s+[A-Z0-9]+\s+through\s+[A-Z0-9]+|S\s+through\s+3XL|XS\s+to\s+3XL)/i);
  if (sizeMatch) {
    sizeRange = createFact('sizeRange', 'Available Size Range', sizeMatch[1]);
  } else if (sizesFromOffers.length > 0) {
    const uniqueSizes = Array.from(new Set(sizesFromOffers));
    sizeRange = createFact('sizeRange', 'Available Size Range', `${uniqueSizes[0]} through ${uniqueSizes[uniqueSizes.length - 1]}`);
  }

  // Artwork Description
  const artworkParagraphs = description
    .split('\n')
    .filter((p) => p.includes('print') || p.includes('emblem') || p.includes('crest') || p.includes('insignia') || p.includes('artwork') || p.includes('graphic'));
  if (artworkParagraphs.length > 0) {
    artworkDescription = createFact('artworkDescription', 'Artwork & Motif Description', artworkParagraphs.join(' '));
  }

  const priceFact = priceRange ? createFact('price', 'Price / Pricing Structure', priceRange) : undefined;

  const retrievalStatus = (productType || fabricComposition || fabricWeight || fit) ? 'success' : 'partial';

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
 * Fetches a product page URL safely from node server.
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
  userOverrides: Partial<Record<string, string>>
): StructuredProductFacts {
  const base: StructuredProductFacts = extracted || {
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

  return updated;
}

/**
 * Formats structured product facts into explicit prompt context for Gemini writer model.
 */
export function formatProductFactsForWriter(facts: StructuredProductFacts | undefined): string {
  if (!facts) {
    return `
PRODUCT FACTS FOR THE WRITER:
No retrieved product facts available. Rely strictly on visual observations from the image and explicitly provided user inputs. Do NOT invent missing material specs, fabric weights, or construction details.
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
    const item = facts[k] as ProductFactItem | undefined;
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
Retrieval Status: ${facts.retrievalStatus} (Source: ${facts.sourceUrl || 'Unspecified'})

CONFIRMED SPECIFICATIONS & PROVENANCE:
${formattedLines.join('\n')}

WRITER INSTRUCTIONS FOR PRODUCT FACTS:
1. Use the supplied product facts above as the factual basis for the brief and resulting entry.
2. Distinguish source-stated claims, user-provided information, and visual observations.
3. Do NOT invent missing specifications, embellish product features (e.g. do NOT claim a pocket is "deep" if the page only specifies "front kangaroo pocket"), or claim that seller-stated information has been independently verified.
4. Use retrieved facts naturally and selectively rather than dumping the entire specification list into prose.
5. If a relevant fact is marked "Unknown", keep it explicitly unknown or flag it for verification—NEVER manufacture neutral or filler values.
`;
}

/**
 * Reconciles the generated ChatGPT writing brief with known facts to eliminate contradictions.
 */
export function reconcileWritingBriefWithFacts(
  brief: ChatGPTWritingBrief,
  facts: StructuredProductFacts | undefined
): ChatGPTWritingBrief {
  if (!brief || !facts) return brief;

  const reconciled = { ...brief };

  // Collect confirmed facts
  const confirmedList: string[] = [...(reconciled.confirmedSpecifications || [])];

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
    const item = facts[k] as ProductFactItem | undefined;
    if (item && item.value && item.value !== 'Unknown') {
      const specLine = `${item.label}: ${item.value} [${item.provenance}]`;
      if (!confirmedList.some((c) => c.toLowerCase().includes(item.label.toLowerCase()))) {
        confirmedList.push(specLine);
      }
    }
  });

  reconciled.confirmedSpecifications = Array.from(new Set(confirmedList));

  // Perform deterministic Factual Quality Audit check
  if (reconciled.editorialQualityAudit && reconciled.sampleEditorialEntry) {
    const text = reconciled.sampleEditorialEntry;
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const hasEmDash = text.includes('—') || text.includes(' -- ');
    const hasGenericOpening = /looking for the perfect gift|searching for something special|must-have|guaranteed to impress/i.test(text);
    const hasUnsupportedLifestyle = /archival reading rooms|long grading sessions|weekend museum visits/i.test(text);

    const lengthPassed = wordCount >= 180 && wordCount <= 240;
    const naturalnessPassed = !hasEmDash && !hasGenericOpening && !hasUnsupportedLifestyle;

    reconciled.editorialQualityAudit.naturalness = naturalnessPassed;
    reconciled.editorialQualityAudit.factualIntegrity = !hasGenericOpening && !hasUnsupportedLifestyle;
    reconciled.editorialQualityAudit.passed = lengthPassed && naturalnessPassed && (reconciled.editorialQualityAudit.specificity ?? true);

    if (!lengthPassed) {
      reconciled.editorialQualityAudit.notes = `Word count audit failed: ${wordCount} words (Required range: 180–240 words, target 210).`;
    } else if (!naturalnessPassed) {
      reconciled.editorialQualityAudit.notes = `Naturalness / factual integrity audit failed: contains em-dashes, generic openings, or unsupported lifestyle assumptions.`;
    } else {
      reconciled.editorialQualityAudit.notes = `Passed all deterministic and editorial checks (${wordCount} words).`;
    }
  }

  // Clean missingInformationDoNotInvent: remove items that are actually KNOWN in facts!
  if (reconciled.missingInformationDoNotInvent) {
    reconciled.missingInformationDoNotInvent = reconciled.missingInformationDoNotInvent.filter((notice) => {
      const lower = notice.toLowerCase();
      // If fabric weight is known, do not state "fleece weight unknown"
      if (facts.fabricWeight?.value && facts.fabricWeight.value !== 'Unknown' && (lower.includes('weight') || lower.includes('fleece weight'))) {
        return false;
      }
      if (facts.fabricComposition?.value && facts.fabricComposition.value !== 'Unknown' && (lower.includes('fabric') || lower.includes('composition') || lower.includes('material'))) {
        return false;
      }
      if (facts.pocketType?.value && facts.pocketType.value !== 'Unknown' && lower.includes('pocket')) {
        return false;
      }
      if (facts.sizeRange?.value && facts.sizeRange.value !== 'Unknown' && lower.includes('size')) {
        return false;
      }
      return true;
    });
  }

  // Clean factsRequiringVerification similarly
  if (reconciled.factsRequiringVerification) {
    reconciled.factsRequiringVerification = reconciled.factsRequiringVerification.filter((fact) => {
      const lower = fact.toLowerCase();
      if (facts.fabricWeight?.value && facts.fabricWeight.value !== 'Unknown' && lower.includes('weight')) {
        return false;
      }
      if (facts.fabricComposition?.value && facts.fabricComposition.value !== 'Unknown' && lower.includes('composition')) {
        return false;
      }
      return true;
    });
  }

  // Ensure claimsAndAssumptionsToAvoid includes guard against embellishing pocket/weight
  const claimsToAvoid = [...(reconciled.claimsAndAssumptionsToAvoid || [])];
  if (!claimsToAvoid.some((c) => c.includes('kangaroo pocket'))) {
    claimsToAvoid.push('Do not embellish "front kangaroo pocket" as "deep pouch pocket" without physical testing.');
  }
  reconciled.claimsAndAssumptionsToAvoid = claimsToAvoid;

  return reconciled;
}
