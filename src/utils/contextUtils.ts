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
 */
export function extractSharedContext(details: ProductDetailsInput): SharedWorkingContext {
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
 * Applies a shared context onto existing details, strictly preserving product-specific fields.
 */
export function applySharedContextToDetails(
  existingDetails: ProductDetailsInput,
  sharedContext: SharedWorkingContext
): ProductDetailsInput {
  return {
    // Preserve product-specific fields
    workingName: existingDetails.workingName || '',
    productType: existingDetails.productType || 'mug',
    productUrl: existingDetails.productUrl || '',
    currentTitle: existingDetails.currentTitle || '',
    currentDescription: existingDetails.currentDescription || '',

    // Apply shared contextual fields
    giftGuideId: sharedContext.giftGuideId || '',
    giftGuideName: sharedContext.giftGuideName || '',
    primaryRecipient: sharedContext.primaryRecipient || '',
    secondaryRecipient: sharedContext.secondaryRecipient || '',
    audienceInterest: sharedContext.audienceInterest || '',
    occasion: sharedContext.occasion || '',
    initialPositioningIdea: sharedContext.initialPositioningIdea || '',
    productSpecs: sharedContext.productSpecs || '',
    knownDesignReferences: sharedContext.knownDesignReferences || '',
    specificQuestions: sharedContext.specificQuestions || ''
  };
}

/**
 * Creates new product details while keeping the current shared context populated,
 * resetting ONLY genuinely product-specific fields (name, shop url, shop title/desc).
 */
export function createNewProductDetailsWithContext(
  currentSharedContext: SharedWorkingContext
): ProductDetailsInput {
  return {
    workingName: '',
    productType: 'mug',
    productUrl: '',
    currentTitle: '',
    currentDescription: '',
    giftGuideId: currentSharedContext.giftGuideId || '',
    giftGuideName: currentSharedContext.giftGuideName || '',
    primaryRecipient: currentSharedContext.primaryRecipient || '',
    secondaryRecipient: currentSharedContext.secondaryRecipient || '',
    audienceInterest: currentSharedContext.audienceInterest || '',
    occasion: currentSharedContext.occasion || '',
    initialPositioningIdea: currentSharedContext.initialPositioningIdea || '',
    productSpecs: currentSharedContext.productSpecs || '',
    knownDesignReferences: currentSharedContext.knownDesignReferences || '',
    specificQuestions: currentSharedContext.specificQuestions || ''
  };
}

/**
 * Deep compares two SharedWorkingContext objects for field equality.
 */
export function areContextsEqual(a: SharedWorkingContext, b: SharedWorkingContext): boolean {
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
export function isContextNonEmpty(context: SharedWorkingContext): boolean {
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
