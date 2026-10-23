/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getGeminiClient,
  PREFERRED_DEFAULT_MODEL,
  handleOptionsRequest,
  Env
} from '../../_common.js';

export async function onRequestOptions() {
  return handleOptionsRequest();
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const body = await context.request.json() as any;
    const {
      details,
      existingTitles = [],
      modelName = PREFERRED_DEFAULT_MODEL,
      count = 6,
    } = body || {};

    if (!details) {
      return Response.json({ error: 'Product details are required to generate titles.' }, { status: 400 });
    }

    const ai = getGeminiClient(context.env.GEMINI_API_KEY);
    const requestedModel = modelName || PREFERRED_DEFAULT_MODEL;

    const prompt = `
You are the Master Editorial Title Strategist for Science of Gifts.
Generate ${count} MORE distinct, creative title options for the following product appearing in the gift guide "${details.giftGuideName || 'Curated Gift Guide'}":

PRODUCT DETAILS:
- Working Name: ${details.workingName || 'Untitled'}
- Product Type: ${details.productType || 'Item'}
- Guide: ${details.giftGuideName || 'Curated Guide'}
- Primary Recipient: ${details.primaryRecipient || 'Gift Recipient'}
- Audience Interest: ${details.audienceInterest || 'General'}
- Current Title: ${details.currentTitle || 'None'}
- Specifications: ${details.productSpecs || 'None'}
- Known Design References: ${details.knownDesignReferences || 'None'}

EXISTING TITLE CANDIDATES TO AVOID REPEATING:
${existingTitles.map((t: string, i: number) => `${i + 1}. "${t}"`).join('\n')}

Generate ${count} NEW, non-repeating titles using distinct approaches:
- 'design_specific'
- 'recipient_oriented'
- 'intellectual_appeal'
- 'witty_irreverent'
- 'practical_gift_appeal'
- 'concise_editorial'
- 'specificity_led'
- 'historical_cultural_reference'

Return a JSON object with 'newTitles' containing an array of title options matching the schema.
`;

    const response = await ai.models.generateContent({
      model: requestedModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        responseSchema: {
          type: 'object',
          properties: {
            newTitles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  proposedTitle: { type: 'string' },
                  strategicApproach: {
                    type: 'string',
                    enum: [
                      'direct_identification',
                      'recipient_oriented',
                      'distinctive_concept',
                      'historical_cultural_reference',
                      'subtle_humor',
                      'editorial_framing',
                      'design_specific',
                      'intellectual_appeal',
                      'witty_irreverent',
                      'practical_gift_appeal',
                      'concise_editorial',
                      'specificity_led',
                    ],
                  },
                  intendedAudience: { type: 'string' },
                  conceptExplanation: { type: 'string' },
                  strengths: { type: 'string' },
                  weaknesses: { type: 'string' },
                  searchIntentConsiderations: { type: 'string' },
                  bestUseContext: {
                    type: 'string',
                    enum: ['editorial_guide_heading', 'shop_product_page', 'seo_title', 'social_share_heading'],
                  },
                  fitScore: { type: 'number' },
                },
                required: ['proposedTitle', 'strategicApproach', 'intendedAudience', 'strengths', 'weaknesses', 'bestUseContext'],
              },
            },
          },
          required: ['newTitles'],
        } as any,
      },
    });

    if (!response.text) {
      throw new Error('Empty response received from title generation model.');
    }

    const parsed = JSON.parse(response.text);
    return Response.json({ success: true, newTitles: parsed.newTitles || [] });
  } catch (err: any) {
    console.error('Generate more titles error:', err);
    return Response.json({ error: err.message || 'Failed to generate additional titles.' }, { status: 500 });
  }
}
