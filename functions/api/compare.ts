/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getGeminiClient,
  PREFERRED_DEFAULT_MODEL,
  PREFERRED_FALLBACK_MODEL,
  isModelAvailabilityError,
  jsonResponse,
  handleOptionsRequest
} from '../../src/services/geminiServerUtils.js';

interface Env {
  GEMINI_API_KEY?: string;
}

export async function onRequestOptions() {
  return handleOptionsRequest();
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const body = await context.request.json() as any;
    const {
      productA,
      productB,
      businessBrain,
      modelName = 'gemini-3.8-flash',
    } = body || {};

    if (!productA || !productB) {
      return jsonResponse({ error: 'Both productA and productB are required for comparison.' }, 400);
    }

    const ai = getGeminiClient(context.env.GEMINI_API_KEY);

    const systemInstruction = `
You are the senior editorial intelligence architect and product strategist for "Science of Gifts".
Your task is to conduct an explainable, multidimensional comparison between two products in the Science of Gifts catalogue.

CRITICAL SIMILARITY PRINCIPLES:
1. Shared historical subject matter alone MUST NOT establish duplication. Two products can both feature the American Civil War or Viking culture while communicating totally different concepts (e.g. academic primary source citation vs casual humor vs archival cartography).
2. Distinguish conceptual overlap (underlying message, joke, identity appeal) from superficial visual or physical format differences.
3. Categorize into one of 5 distinct categories:
   - "near_duplicate": Same concept and recipient persona; risks catalogue cannibalization.
   - "strongly_overlapping": Substantial overlap in either concept or recipient; requires distinct editorial framing.
   - "distinct_positioning": Same subject/niche, but completely different intellectual appeals or recipient depth.
   - "complementary": Different formats or angles that pair well together in a gift collection.
   - "unrelated": Different subjects and audiences.
4. When information (mockup image, recipient profile, specifications) is missing, explicitly report uncertainty rather than guessing.
5. Provide specific evidence and meaningful differences for each dimension.
`;

    const promptText = `
Compare the following two products across all 6 dimensions:

PRODUCT A:
- Name: ${productA.details?.workingName || 'Untitled'}
- Format / Type: ${productA.details?.productType || 'Unspecified'}
- Assigned Guide: ${productA.details?.giftGuideName || 'Unassigned'}
- Primary Recipient: ${productA.details?.primaryRecipient || 'Unspecified'}
- Secondary Recipient: ${productA.details?.secondaryRecipient || 'None'}
- Niche / Interest: ${productA.details?.audienceInterest || 'Unspecified'}
- Initial Positioning: ${productA.details?.initialPositioningIdea || 'None'}
- Specifications: ${productA.details?.productSpecs || 'None'}
- Design References: ${productA.details?.knownDesignReferences || 'None'}

PRODUCT B:
- Name: ${productB.details?.workingName || 'Untitled'}
- Format / Type: ${productB.details?.productType || 'Unspecified'}
- Assigned Guide: ${productB.details?.giftGuideName || 'Unassigned'}
- Primary Recipient: ${productB.details?.primaryRecipient || 'Unspecified'}
- Secondary Recipient: ${productB.details?.secondaryRecipient || 'None'}
- Niche / Interest: ${productB.details?.audienceInterest || 'Unspecified'}
- Initial Positioning: ${productB.details?.initialPositioningIdea || 'None'}
- Specifications: ${productB.details?.productSpecs || 'None'}
- Design References: ${productB.details?.knownDesignReferences || 'None'}

ACTIVE BUSINESS BRAIN CONTEXT:
Editorial Voice: ${businessBrain?.editorialVoiceAndRules || 'Authoritative, nuanced, respectful'}
Gift Guide Philosophy: ${businessBrain?.giftGuidePhilosophy || 'Curated editorial argument'}

Return a strictly valid JSON object matching the comparison schema.
`;

    const requestedModel = modelName || PREFERRED_DEFAULT_MODEL;
    const compareModelConfig = {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.4,
      responseSchema: {
        type: 'object',
        properties: {
          overallCategory: {
            type: 'string',
            enum: ['near_duplicate', 'strongly_overlapping', 'distinct_positioning', 'complementary', 'unrelated'],
          },
          categoryLabel: { type: 'string' },
          heuristicScore: { type: 'number', description: 'Heuristic similarity estimate 0-100' },
          qualitativeAssessment: { type: 'string' },
          positioningImplications: { type: 'string' },
          recommendedAction: { type: 'string' },
          keySimilarities: { type: 'array', items: { type: 'string' } },
          keyDifferences: { type: 'array', items: { type: 'string' } },
          missingInformationWarnings: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          dimensions: {
            type: 'object',
            properties: {
              subject: {
                type: 'object',
                properties: {
                  level: { type: 'string', enum: ['identical', 'high', 'moderate', 'low', 'none', 'insufficient_data'] },
                  summary: { type: 'string' },
                  specificEvidence: { type: 'array', items: { type: 'string' } },
                  meaningfulDifferences: { type: 'array', items: { type: 'string' } },
                },
                required: ['level', 'summary', 'specificEvidence', 'meaningfulDifferences'],
              },
              conceptual: {
                type: 'object',
                properties: {
                  level: { type: 'string', enum: ['identical', 'high', 'moderate', 'low', 'none', 'insufficient_data'] },
                  summary: { type: 'string' },
                  specificEvidence: { type: 'array', items: { type: 'string' } },
                  meaningfulDifferences: { type: 'array', items: { type: 'string' } },
                },
                required: ['level', 'summary', 'specificEvidence', 'meaningfulDifferences'],
              },
              visual: {
                type: 'object',
                properties: {
                  level: { type: 'string', enum: ['identical', 'high', 'moderate', 'low', 'none', 'insufficient_data'] },
                  summary: { type: 'string' },
                  specificEvidence: { type: 'array', items: { type: 'string' } },
                  meaningfulDifferences: { type: 'array', items: { type: 'string' } },
                },
                required: ['level', 'summary', 'specificEvidence', 'meaningfulDifferences'],
              },
              recipient: {
                type: 'object',
                properties: {
                  level: { type: 'string', enum: ['identical', 'high', 'moderate', 'low', 'none', 'insufficient_data'] },
                  summary: { type: 'string' },
                  specificEvidence: { type: 'array', items: { type: 'string' } },
                  meaningfulDifferences: { type: 'array', items: { type: 'string' } },
                },
                required: ['level', 'summary', 'specificEvidence', 'meaningfulDifferences'],
              },
              editorial: {
                type: 'object',
                properties: {
                  level: { type: 'string', enum: ['identical', 'high', 'moderate', 'low', 'none', 'insufficient_data'] },
                  summary: { type: 'string' },
                  specificEvidence: { type: 'array', items: { type: 'string' } },
                  meaningfulDifferences: { type: 'array', items: { type: 'string' } },
                },
                required: ['level', 'summary', 'specificEvidence', 'meaningfulDifferences'],
              },
              format: {
                type: 'object',
                properties: {
                  level: { type: 'string', enum: ['identical', 'high', 'moderate', 'low', 'none', 'insufficient_data'] },
                  summary: { type: 'string' },
                  specificEvidence: { type: 'array', items: { type: 'string' } },
                  meaningfulDifferences: { type: 'array', items: { type: 'string' } },
                },
                required: ['level', 'summary', 'specificEvidence', 'meaningfulDifferences'],
              },
            },
            required: ['subject', 'conceptual', 'visual', 'recipient', 'editorial', 'format'],
          },
        },
        required: [
          'overallCategory',
          'categoryLabel',
          'heuristicScore',
          'qualitativeAssessment',
          'positioningImplications',
          'recommendedAction',
          'keySimilarities',
          'keyDifferences',
          'dimensions',
          'confidence',
        ],
      } as any,
    };

    let response: any;
    try {
      response = await ai.models.generateContent({
        model: requestedModel,
        contents: promptText,
        config: compareModelConfig as any,
      });
    } catch (err: any) {
      if (isModelAvailabilityError(err)) {
        console.warn(`Comparison with ${requestedModel} failed, trying ${PREFERRED_FALLBACK_MODEL}...`);
        response = await ai.models.generateContent({
          model: PREFERRED_FALLBACK_MODEL,
          contents: promptText,
          config: compareModelConfig as any,
        });
      } else {
        throw err;
      }
    }

    if (!response || !response.text) {
      throw new Error('Comparison model returned empty response.');
    }

    const parsed = JSON.parse(response.text);

    const comparisonKey = [productA.id, productB.id].sort().join('___');

    return jsonResponse({
      success: true,
      result: {
        id: `comp_ai_${comparisonKey}_${Date.now().toString(36)}`,
        comparisonKey,
        productAId: productA.id,
        productAName: productA.details?.workingName || 'Product A',
        productAFormat: productA.details?.productType,
        productAGuide: productA.details?.giftGuideName,
        productBId: productB.id,
        productBName: productB.details?.workingName || 'Product B',
        productBFormat: productB.details?.productType,
        productBGuide: productB.details?.giftGuideName,
        engine: 'gemini_multidimensional_v1',
        calculatedAt: new Date().toISOString(),
        ...parsed,
      },
    });
  } catch (err: any) {
    console.error('Comparison error:', err);
    return jsonResponse({
      error: err.message || 'Failed to execute multidimensional comparison.',
      details: err.stack,
    }, 500);
  }
}
