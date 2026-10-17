/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApprovedWritingExample } from './phase3';
export type { ApprovedWritingExample };

export type ContentTypeKey =
  | 'product_entry'
  | 'introduction'
  | 'buying_advice'
  | 'faq'
  | 'closing'
  | 'informational_article';

export interface ContentTypeProfile {
  instructions: string;
  formattingRules: string;
}

export interface WritingGuidelinesSettings {
  id: string; // 'active_guidelines'
  universalGuidelines: string;
  voiceAndTone: string;
  styleAndFormatting: string;
  thingsToAvoid: string;
  factualAndEditorialGuardrails: string;
  contentTypeProfiles: Record<ContentTypeKey, ContentTypeProfile>;
  updatedAt: string;
}
