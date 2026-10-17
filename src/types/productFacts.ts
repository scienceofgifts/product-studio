/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FactProvenance = 'source-stated' | 'user-provided' | 'visual-observation' | 'unknown';

export interface ProductFactItem {
  id: string; // e.g. 'productType', 'color', 'fabricComposition', 'fabricWeight', 'fit', 'hoodConstruction', 'pocketType', 'sizeRange', 'artworkDescription', 'price'
  label: string; // e.g. "Fabric Composition"
  value: string; // e.g. "80% cotton and 20% recycled polyester fleece"
  provenance: FactProvenance;
  sourceRef?: string; // e.g. "JSON-LD schema on shop.scienceofgifts.com"
  isVerified?: boolean;
  uncertaintyOrConflict?: string;
  originalSourceValue?: string; // Preserved if user manually overrides
}

export interface StructuredProductFacts {
  retrievalStatus: 'success' | 'partial' | 'failed' | 'unattempted';
  retrievedAt?: string;
  sourceUrl?: string;
  retrievalError?: string;
  rawExtractedTitle?: string;
  rawExtractedDescription?: string;

  productType?: ProductFactItem;
  color?: ProductFactItem;
  fabricComposition?: ProductFactItem;
  fabricWeight?: ProductFactItem;
  fit?: ProductFactItem;
  hoodConstruction?: ProductFactItem;
  pocketType?: ProductFactItem;
  sizeRange?: ProductFactItem;
  artworkDescription?: ProductFactItem;
  price?: ProductFactItem;
  additionalSpecs?: ProductFactItem[];
}
