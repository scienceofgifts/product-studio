/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductDetailsInput, SharedWorkingContext } from '../types';

export const EMPTY_SHARED_CONTEXT: SharedWorkingContext = {
  giftGuideId: '',
  giftGuideName: '',
  primaryRecipient: '',
  secondaryRecipient: '',
  audienceInterest: '',
  occasion: '',
  initialPositioningIdea: '',
  productSpecs: '',
  knownDesignReferences: '',
  specificQuestions: ''
};

/**
 * Extracts shared context fields from a full ProductDetailsInput object.
 * Guaranteed to return all 10 reusable fields with safe string fallbacks.
 */
export function extractSharedContext(details?: Partial<ProductDetailsInput> | null): SharedWorkingContext {
  if (!details) return { ...EMPTY_SHARED_CONTEXT };
  return {
    giftGuideId: details.giftGuideId || '',
    giftGuideName: details.giftGuideName || '',
    primaryRecipient: details.primaryRecipient || '',
    secondaryRecipient: details.secondaryRecipient || '',
    audienceInterest: details.audienceInterest || '',
    occasion: details.occasion || '',
    initialPositioningIdea: details.initialPositioningIdea || '',
    productSpecs: details.productSpecs || '',
    knownDesignReferences: details.knownDesignReferences || '',
    specificQuestions: details.specificQuestions || ''
  };
}

/**
 * Applies a shared context onto existing details, strictly preserving product-specific fields
 * (workingName, productType, productUrl, currentTitle, currentDescription, extractedFacts).
 */
export function applySharedContextToDetails(
  existingDetails: ProductDetailsInput,
  sharedContext?: Partial<SharedWorkingContext> | null
): ProductDetailsInput {
  const ctx = sharedContext || EMPTY_SHARED_CONTEXT;
  return {
    // Preserve product-specific fields
    workingName: existingDetails?.workingName || '',
    productType: existingDetails?.productType || 'mug',
    productUrl: existingDetails?.productUrl || '',
    currentTitle: existingDetails?.currentTitle || '',
    currentDescription: existingDetails?.currentDescription || '',
    extractedFacts: existingDetails?.extractedFacts,

    // Apply shared contextual fields
    giftGuideId: ctx.giftGuideId || '',
    giftGuideName: ctx.giftGuideName || '',
    primaryRecipient: ctx.primaryRecipient || '',
    secondaryRecipient: ctx.secondaryRecipient || '',
    audienceInterest: ctx.audienceInterest || '',
    occasion: ctx.occasion || '',
    initialPositioningIdea: ctx.initialPositioningIdea || '',
    productSpecs: ctx.productSpecs || '',
    knownDesignReferences: ctx.knownDesignReferences || '',
    specificQuestions: ctx.specificQuestions || ''
  };
}

/**
 * Creates new product details while keeping the current shared context populated,
 * resetting ONLY genuinely product-specific fields (name, shop url, shop title/desc, facts).
 */
export function createNewProductDetailsWithContext(
  currentSharedContext?: Partial<SharedWorkingContext> | null
): ProductDetailsInput {
  const ctx = currentSharedContext || EMPTY_SHARED_CONTEXT;
  return {
    workingName: '',
    productType: 'mug',
    productUrl: '',
    currentTitle: '',
    currentDescription: '',
    extractedFacts: undefined,
    giftGuideId: ctx.giftGuideId || '',
    giftGuideName: ctx.giftGuideName || '',
    primaryRecipient: ctx.primaryRecipient || '',
    secondaryRecipient: ctx.secondaryRecipient || '',
    audienceInterest: ctx.audienceInterest || '',
    occasion: ctx.occasion || '',
    initialPositioningIdea: ctx.initialPositioningIdea || '',
    productSpecs: ctx.productSpecs || '',
    knownDesignReferences: ctx.knownDesignReferences || '',
    specificQuestions: ctx.specificQuestions || ''
  };
}

/**
 * Deep compares two SharedWorkingContext objects for field equality.
 */
export function areContextsEqual(
  a?: Partial<SharedWorkingContext> | null,
  b?: Partial<SharedWorkingContext> | null
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    (a.giftGuideId || '') === (b.giftGuideId || '') &&
    (a.giftGuideName || '') === (b.giftGuideName || '') &&
    (a.primaryRecipient || '').trim() === (b.primaryRecipient || '').trim() &&
    (a.secondaryRecipient || '').trim() === (b.secondaryRecipient || '').trim() &&
    (a.audienceInterest || '').trim() === (b.audienceInterest || '').trim() &&
    (a.occasion || '').trim() === (b.occasion || '').trim() &&
    (a.initialPositioningIdea || '').trim() === (b.initialPositioningIdea || '').trim() &&
    (a.productSpecs || '').trim() === (b.productSpecs || '').trim() &&
    (a.knownDesignReferences || '').trim() === (b.knownDesignReferences || '').trim() &&
    (a.specificQuestions || '').trim() === (b.specificQuestions || '').trim()
  );
}

/**
 * Checks if a context has any substantive content filled out.
 */
export function isContextNonEmpty(context?: Partial<SharedWorkingContext> | null): boolean {
  if (!context) return false;
  return Boolean(
    context.giftGuideId ||
    context.primaryRecipient?.trim() ||
    context.secondaryRecipient?.trim() ||
    context.audienceInterest?.trim() ||
    context.occasion?.trim() ||
    context.initialPositioningIdea?.trim() ||
    context.productSpecs?.trim() ||
    context.knownDesignReferences?.trim() ||
    context.specificQuestions?.trim()
  );
}
