/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getGeminiClient,
  ALLOWED_MODELS,
  PREFERRED_DEFAULT_MODEL,
  PREFERRED_FALLBACK_MODEL,
  isModelAvailabilityError,
  validateWritingBrief,
  validateTitleLaboratory,
  validateRecipientIntelligence,
  ensureSampleEntryWordCountRange,
  visualConceptualSchema,
  recipientIntelligenceSchema,
  productPositioningSchema,
  giftGuideFitSchema,
  titleLaboratorySchema,
  competitiveDifferentiationSchema,
  writingBriefSchema,
  scoringSchema,
  jsonResponse,
  handleOptionsRequest
} from '../../src/services/geminiServerUtils.js';
import {
  fetchAndExtractProductFacts,
  formatProductFactsForWriter,
  reconcileWritingBriefWithFacts
} from '../../src/services/productFactsService.js';
import { DEFAULT_EDITORIAL_RULES } from '../../src/data/defaultEditorialRules.js';

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
      imageBase64,
      imageMimeType,
      images,
      details,
      relevantCatalogueEntries,
      mode = 'full',
      editorialRules: clientEditorialRules,
      modelName = 'gemini-3.8-flash',
      extractedFacts: clientFacts
    } = body || {};

    const allImages: Array<{ imageBase64: string; imageMimeType?: string }> = [];
    if (Array.isArray(images) && images.length > 0) {
      allImages.push(...images);
    } else if (imageBase64) {
      allImages.push({ imageBase64, imageMimeType });
    }

    if (allImages.length === 0 && !details) {
      return jsonResponse({ error: 'Either a product image or product details are required.' }, 400);
    }

    // Ensure facts are present or auto-fetch server-side if URL is provided
    let effectiveFacts = clientFacts || details?.extractedFacts;
    if (!effectiveFacts && details?.productUrl && details.productUrl.startsWith('http')) {
      try {
        effectiveFacts = await fetchAndExtractProductFacts(details.productUrl);
      } catch (e) {
        console.warn('Auto-fetch facts on server failed:', e);
      }
    }

    const productFactsPrompt = formatProductFactsForWriter(effectiveFacts);

    const ai = getGeminiClient(context.env.GEMINI_API_KEY);

    const effectiveEditorialRules = (typeof clientEditorialRules === 'string' && clientEditorialRules.trim())
      ? clientEditorialRules.trim()
      : DEFAULT_EDITORIAL_RULES;

    const systemInstruction = `
You write product entries for Science of Gifts, a gift-guide website that helps people choose thoughtful gifts for recipients with specific interests.
Science of Gifts develops and curates products for highly specific passions (e.g. Viking history, American Civil War, WWII aviation, classical literature, teaching history, content creation) and helps gift buyers find deeply meaningful gifts.

EDITORIAL PRECEDENCE POLICY (CRITICAL):
1. Verified Physical Product Facts have HIGHEST PRECEDENCE. Never override or contradict verified facts (materials, dimensions, colors, verified specifications) with creative or editorial assumptions.
2. Global Editorial Rules apply by default across all entries and briefs.
3. Explicit Product-Specific Selections & Choices control the creative direction, target recipient, and output format for this specific product.
4. Detect and surface material contradictions if any exist between product facts and editorial ideas.

CRITICAL EDITORIAL REASONING PROCESS (MUST EXECUTE IN ORDER):
Before generating brief instructions or draft copy, internally reason through these 5 Product-Specific Editorial Steps:

1. Step A — Distinctive Concept: Identify the central concept, joke, visual metaphor, wordplay, historical reference, or symbolism distinguishing this product from generic alternatives.
2. Step B — Curated Design Details: Select the 2-3 most meaningful details and explain how they work together (NEVER an exhaustive inventory).
3. Step C — Why the Design Works: Derive a specific editorial interpretation. Explain what makes the design clever, recognizable, amusing, visually effective, or meaningful to its intended audience.
4. Step D — Buyer-Facing Perspective: Address the gift chooser while making the recipient and product appeal central. Explain why this design appeals to the recipient without generic slogan fluff.
5. Step E — Verified Facts Selection: Select only verified physical details (fabric weight, composition, dimensions) supporting the entry. Never invent features or production details.

GLOBAL EDITORIAL RULES:
${effectiveEditorialRules}

TASK:
Perform structured reasoning for Analysis Mode: "${mode}".
Return a strictly valid JSON object matching the requested schema.
`;

    const catalogueSection = Array.isArray(relevantCatalogueEntries) && relevantCatalogueEntries.length > 0
      ? `
EXISTING RELEVANT CATALOGUE PRODUCTS (FOR EDITORIAL & COMPETITIVE DIFFERENTIATION):
${relevantCatalogueEntries.map((c: any, i: number) => `[Catalogue Item ${i + 1}]: "${c.name}" (${c.productType})
  - Guide: ${c.giftGuideName || 'Unassigned'}
  - Primary Recipient: ${c.primaryRecipient || 'Unspecified'}
  - Key Appeal / Notes: ${c.keyAppeal || c.initialPositioningIdea || 'None'}
  ${c.similarityNote ? `- Relationship: ${c.similarityNote}` : ''}`).join('\n')}

CATALOGUE DIFFERENTIATION MANDATE:
- In Module D (Gift Guide Fit), evaluate how this new product fits alongside the existing catalogue products above, identifying whether it introduces fresh variety or risks guide redundancy/cannibalization.
- In Module F (Differentiation) and Module G (ChatGPT Writing Brief), explicitly instruct how this new product differs from the above existing products and what specific angle or evidence the writer must emphasize to avoid repetitive entries.
`
      : `
CATALOGUE INVENTORY NOTICE:
No existing catalogue records were matched or supplied for this niche. Explicitly state in Module D and Module F that catalogue overlap evaluation is based on a clean or unimported baseline.
`;

    const baseProductPrompt = `
PRODUCT INPUT DETAILS:
- Working Product Name: ${details?.workingName || 'Untitled'}
- Product Type: ${details?.productType || 'unspecified'}
- Gift Guide: ${details?.giftGuideName || 'None selected'}
- Primary Intended Recipient: ${details?.primaryRecipient || 'Unspecified'}
- Secondary Recipient: ${details?.secondaryRecipient || 'None noted'}
- Audience Interest / Niche: ${details?.audienceInterest || 'Unspecified'}
- Gifting Occasion: ${details?.occasion || 'General gift'}
- Existing Product URL: ${details?.productUrl || 'None'}
- Current Title: ${details?.currentTitle || 'None'}
- Current Description: ${details?.currentDescription || 'None'}
- Specifications: ${details?.productSpecs || 'None provided'}
- Known Design References: ${details?.knownDesignReferences || 'None supplied'}
- User Initial Positioning Idea: ${details?.initialPositioningIdea || 'None'}
- Specific Questions or Concerns: ${details?.specificQuestions || 'None'}

${productFactsPrompt}

${catalogueSection}
`;

    let modeSpecificPrompt = '';
    if (mode === 'title') {
      modeSpecificPrompt = `
ANALYSIS MODE: Title Laboratory
YOUR PRIMARY MISSION:
You are acting exclusively as the Master Editorial Title Strategist and Copy Chief for Science of Gifts.
DO NOT generate a sample editorial entry, lengthy writing brief, or generic filler. Devote your entire analytical depth to title development, candidate generation across distinct strategies, critical evaluation of any existing title, and strategic trade-offs for gift-guide placement.

1. CRITICAL EVALUATION OF EXISTING / CURRENT TITLE:
Current title supplied: "${details?.currentTitle || details?.workingName || 'None provided'}"
Critically evaluate this title:
- What works (if anything)?
- What fails, limits appeal, or risks buyer confusion (e.g. generic commodity phrasing, keyword-stuffed ecommerce jargon, missing the central joke/artwork, confusing to gift shoppers, or lacking editorial distinction)?
- Assign a diagnostic verdict: 'needs_replacement' | 'viable_with_revisions' | 'strong_starting_point' | 'none_provided'.
- Provide actionable notes on how to dramatically improve or replace it.

2. GENERATE AT LEAST 8 TO 10 GENUINELY DISTINCT TITLE CANDIDATES:
Do NOT produce slight variations or re-orderings of the same sentence. Explore meaningfully different editorial angles:
- 'design_specific': focuses specifically on the artwork, inscription, historical crest, visual metaphor, or motif.
- 'recipient_oriented': connects the product directly to a specific kind of person and their identity/role.
- 'intellectual_appeal': emphasizes scholarly knowledge, historical detail, literary reference, or cultural understanding.
- 'witty_irreverent': employs smart humor, dry irony, or wit where the design supports it.
- 'practical_gift_appeal': highlights why this is a thoughtful, delightful gift to receive.
- 'concise_editorial': prioritizes a natural, memorable, punchy editorial headline.
- 'specificity_led': distinguishes the item sharply from generic commodity products.
- 'historical_cultural_reference': grounds the title in authentic historical period, manuscript, or cultural provenance.
- 'direct_identification': clear, unambiguous product name without fluff.
- 'distinctive_concept': highlights the central clever premise.

For EACH candidate:
- proposedTitle: Polished, production-ready title.
- strategicApproach: One of the strategies above.
- intendedAudience: Specific recipient slice targeted.
- conceptExplanation: Clear explanation of what this title emphasizes.
- strengths: Why this title works.
- weaknesses: What trade-offs or risks it carries.
- searchIntentConsiderations: How gift-searchers vs passionate fans will discover it.
- bestUseContext: 'editorial_guide_heading' | 'shop_product_page' | 'seo_title' | 'social_share_heading'.
- fitScore: Score from 1 to 10 evaluating overall fit for Science of Gifts.

3. COMPARATIVE ANALYSIS & RECOMMENDATIONS:
- recommendedTitle: The definitive winning editorial choice for guide publication.
- recommendedRationale: Thorough reasoning explaining why this title wins over all other candidates.
- recommendedTitleTradeOffs: Strategic trade-offs accepted by choosing this recommendation.
- runnerUpTitle: The strongest alternative title.
- runnerUpRationale: Specific scenario where an editor should choose the runner-up instead.
- intendedTitleContext: Clarify whether it serves best as an in-article subheading or standalone item title.
- searchIntentDisclaimer: Guidance on balancing editorial voice with search intent.
- guidePositioningContext: How this title complements the gift guide without sounding repetitive alongside other products.
`;
    } else if (mode === 'recipient') {
      modeSpecificPrompt = `
ANALYSIS MODE: Recipient Intelligence Dossier
YOUR PRIMARY MISSION:
You are acting as the Chief Recipient Psychologist and Gift Intelligence Researcher for Science of Gifts.
DO NOT generate a title matrix, draft editorial copy, or writing brief. Devote your analysis to unpacking the recipient's psyche, passion depth, the dynamic between gift-buyer and recipient, appeal types, gifting occasions, and critical mismatch risks.

REQUIRED RECIPIENT INTELLIGENCE:
1. Primary Recipient Deep Profile: Thorough portrait of the recipient, their lifestyle, identity markers, and aesthetic values.
2. Subject Knowledge Depth Spectrum:
   - casualLevel: What someone with casual appreciation finds enjoyable.
   - enthusiastLevel: What resonates with an active hobbyist or passionate fan.
   - specialistLevel: Scrutiny by a serious academic, specialist, or practitioner (does the item pass muster or cringe?).
3. Buyer Motivation vs. Recipient Perspective (The Gifting Dynamic):
   - buyerMotivation: What the gift-giver thinks they are giving and why they are drawn to it.
   - recipientPreference: What the recipient actually values, notices, and wants to experience.
   - alignmentRisk: Where a well-meaning purchase could feel superficial, cliché, or off-target.
4. Appeal Types: Evaluate intellectual, aesthetic, functional, humorous, sentimental, and identity-based appeal with concrete reasons.
5. AUDIENCE MISMATCHES ("Who NOT to Buy This For"): Crucial warnings identifying who will dislike, misunderstand, or cringe at this item.
6. Reasons it might not appeal or fall flat.
7. Relevant Gifting Occasions & Contexts: Best moments to give this item.
8. Shopper Buying Advice: 3 to 5 practical, actionable tips for the buyer on presentation, sizing, or framing the gift.
`;
    } else if (mode === 'brief') {
      modeSpecificPrompt = `
ANALYSIS MODE: ChatGPT Writing Brief
YOUR PRIMARY MISSION:
You are acting as the Master Editorial Writing Director for Science of Gifts.
Bypass preliminary visual analysis tables and generate a pristine, standalone, production-grade writing brief formatted for ChatGPT to craft the finished editorial entry.

REQUIRED WRITING BRIEF COMPONENTS:
1. Canonical Product Identity & Verified Physical Specifications (strictly deduplicated, verified facts).
2. Guide Context & Recipient Profile.
3. Recommended Titles (Primary editorial title and 2-3 alternatives).
4. Editorial Angle & the 5 Product-Specific Reasoning Steps:
   - Step A: Distinctive Concept distinguishing this product from generic alternatives.
   - Step B: Curated Design Details to emphasize (2-3 most meaningful details).
   - Step C: Why the Design Works (specific editorial interpretation of why it resonates).
   - Step D: Buyer-Facing Interpretation (why this design appeals to the recipient).
   - Step E: Verified Facts to Include naturally.
5. Design Details to Emphasize with their relationship to the recipient.
6. Tone and Style Directives: Perceptive, restrained, scholarly, NO em-dashes ("—"), NO generic slogans.
7. Claims & Assumptions to Avoid.
8. Deterministic QC Checklist.
9. High-Fidelity Reference Sample Editorial Entry (180 to 240 words).
10. Quality Audit: Specificity, interpretation, angle quality, factual integrity, naturalness, buyer usefulness.
`;
    } else {
      modeSpecificPrompt = `
ANALYSIS MODE: Full Analysis
YOUR PRIMARY MISSION:
Perform a comprehensive 360-degree editorial intelligence audit covering all 7 modules:
- Module A: Visual and Conceptual Analysis
- Module B: Recipient Intelligence
- Module C: Product Positioning Angles (preferred, viable, weak)
- Module D: Gift-Guide Fit & Catalogue Differentiation
- Module E: Title Laboratory (8+ diverse options & recommendation)
- Module F: Competitive Differentiation
- Module G: ChatGPT Writing Brief (including 5 reasoning steps & 180-240 word sample entry)
- Scoring: Transparent scores (1-10 or null) across 6 dimensions.
`;
    }

    const promptText = `
Analyze the following product for Science of Gifts:

${baseProductPrompt}

${modeSpecificPrompt}

Ensure every field is thoroughly reasoned, human-sounding, and rigorously grounded in evidence.
`;

    const contentsParts: any[] = [];

    for (const img of allImages) {
      if (!img.imageBase64) continue;
      let cleanBase64 = String(img.imageBase64).trim();
      while (cleanBase64.startsWith('data:')) {
        cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/, '').trim();
      }

      const validGeminiMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
      const targetMime = validGeminiMimeTypes.includes(img.imageMimeType || '') ? img.imageMimeType! : 'image/png';

      contentsParts.push({
        inlineData: {
          mimeType: targetMime,
          data: cleanBase64,
        },
      });
    }

    contentsParts.push({
      text: promptText,
    });

    const requestedModel = modelName || PREFERRED_DEFAULT_MODEL;
    if (!ALLOWED_MODELS.includes(requestedModel)) {
      return jsonResponse({
        error: `Requested model '${requestedModel}' is not in the approved server-side allowlist. Approved models: ${ALLOWED_MODELS.join(', ')}`,
      }, 400);
    }

    let actualModel = requestedModel;
    let fallbackOccurred = false;
    let fallbackReason: string | undefined = undefined;

    // Construct mode-specific responseSchema
    let targetSchema: any;
    if (mode === 'title') {
      targetSchema = {
        type: 'object',
        properties: {
          incompleteInformationNotices: { type: 'array', items: { type: 'string' } },
          titleLaboratory: titleLaboratorySchema,
        },
        required: ['titleLaboratory'],
      };
    } else if (mode === 'recipient') {
      targetSchema = {
        type: 'object',
        properties: {
          incompleteInformationNotices: { type: 'array', items: { type: 'string' } },
          recipientIntelligence: recipientIntelligenceSchema,
        },
        required: ['recipientIntelligence'],
      };
    } else if (mode === 'brief') {
      targetSchema = {
        type: 'object',
        properties: {
          incompleteInformationNotices: { type: 'array', items: { type: 'string' } },
          writingBrief: writingBriefSchema,
          titleLaboratory: titleLaboratorySchema,
        },
        required: ['writingBrief'],
      };
    } else {
      targetSchema = {
        type: 'object',
        properties: {
          incompleteInformationNotices: { type: 'array', items: { type: 'string' } },
          visualConceptual: visualConceptualSchema,
          recipientIntelligence: recipientIntelligenceSchema,
          productPositioning: productPositioningSchema,
          giftGuideFit: giftGuideFitSchema,
          titleLaboratory: titleLaboratorySchema,
          competitiveDifferentiation: competitiveDifferentiationSchema,
          writingBrief: writingBriefSchema,
          scoring: scoringSchema,
        },
        required: [
          'visualConceptual',
          'recipientIntelligence',
          'productPositioning',
          'giftGuideFit',
          'titleLaboratory',
          'competitiveDifferentiation',
          'writingBrief',
          'scoring',
        ],
      };
    }

    const modelConfig = {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.7,
      responseSchema: targetSchema,
    };

    let parsed: any = null;
    let validationResult: { isValid: boolean; errors: string[] } = { isValid: false, errors: [] };
    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries && !validationResult.isValid) {
      attempt++;
      let response: any;
      try {
        response = await ai.models.generateContent({
          model: requestedModel,
          contents: { parts: contentsParts },
          config: modelConfig as any,
        });
      } catch (primaryErr: any) {
        if (isModelAvailabilityError(primaryErr)) {
          console.warn(`Model ${requestedModel} unavailable (${primaryErr.message}). Retrying with fallback model ${PREFERRED_FALLBACK_MODEL}...`);
          await new Promise((r) => setTimeout(r, 1000));
          try {
            response = await ai.models.generateContent({
              model: PREFERRED_FALLBACK_MODEL,
              contents: { parts: contentsParts },
              config: modelConfig as any,
            });
            actualModel = PREFERRED_FALLBACK_MODEL;
            fallbackOccurred = true;
            fallbackReason = `Requested model '${requestedModel}' was unavailable (${primaryErr.message?.slice(0, 100)}). Analysis fell back to '${PREFERRED_FALLBACK_MODEL}'.`;
          } catch (fallbackErr: any) {
            console.warn(`Fallback model ${PREFERRED_FALLBACK_MODEL} also failed. Retrying primary model after delay...`);
            await new Promise((r) => setTimeout(r, 2000));
            response = await ai.models.generateContent({
              model: requestedModel,
              contents: { parts: contentsParts },
              config: modelConfig as any,
            });
          }
        } else {
          throw primaryErr;
        }
      }

      if (!response || !response.text) {
        console.warn(`Attempt ${attempt}: Empty response received from Gemini model.`);
        if (attempt <= maxRetries) {
          continue;
        } else {
          throw new Error('Empty response received from Gemini model after retries.');
        }
      }

      const responseText = response.text;

      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr: any) {
        console.warn(`Attempt ${attempt}: JSON parse failed:`, parseErr.message);
        continue;
      }

      if (mode === 'title') {
        if (parsed && parsed.titleLaboratory) {
          validationResult = validateTitleLaboratory(parsed.titleLaboratory);
        } else {
          validationResult = { isValid: false, errors: ['Missing titleLaboratory in model response'] };
        }
      } else if (mode === 'recipient') {
        if (parsed && parsed.recipientIntelligence) {
          validationResult = validateRecipientIntelligence(parsed.recipientIntelligence);
        } else {
          validationResult = { isValid: false, errors: ['Missing recipientIntelligence in model response'] };
        }
      } else if (mode === 'brief') {
        if (parsed && parsed.writingBrief) {
          parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts);
          parsed.writingBrief = await ensureSampleEntryWordCountRange(ai, actualModel, parsed.writingBrief);
          parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts);
          validationResult = validateWritingBrief(parsed.writingBrief, details);
          if (!parsed.titleLaboratory && parsed.writingBrief.recommendedTitles?.primary) {
            parsed.titleLaboratory = {
              titleOptions: (parsed.writingBrief.recommendedTitles.alternatives || []).map((t: string) => ({
                proposedTitle: t,
                strategicApproach: 'editorial_framing',
                intendedAudience: parsed.writingBrief.recipientProfile?.primaryRecipient || 'Target Recipient',
                strengths: 'Alternative candidate from writing brief',
                weaknesses: 'Secondary option',
                bestUseContext: 'editorial_guide_heading',
              })),
              recommendedTitle: parsed.writingBrief.recommendedTitles.primary,
              recommendedTitleTradeOffs: 'Selected primary editorial title from writing brief.',
              recommendedRationale: parsed.writingBrief.editorialAngle?.strategicRationale || 'Selected for editorial fit.',
              intendedTitleContext: 'editorial_guide_heading',
              searchIntentDisclaimer: 'Derived from ChatGPT writing brief recommendation.',
            };
          }
        } else {
          validationResult = { isValid: false, errors: ['Missing writingBrief in model response'] };
        }
      } else {
        // Full analysis mode
        if (parsed && parsed.writingBrief && parsed.titleLaboratory) {
          parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts);
          parsed.writingBrief = await ensureSampleEntryWordCountRange(ai, actualModel, parsed.writingBrief);
          parsed.writingBrief = reconcileWritingBriefWithFacts(parsed.writingBrief, effectiveFacts);
          const briefVal = validateWritingBrief(parsed.writingBrief, details);
          const titleVal = validateTitleLaboratory(parsed.titleLaboratory);
          const errors = [...briefVal.errors, ...titleVal.errors];
          validationResult = { isValid: errors.length === 0, errors };
        } else {
          validationResult = { isValid: false, errors: ['Missing writingBrief or titleLaboratory in full analysis model response'] };
        }
      }

      if (!validationResult.isValid) {
        console.warn(`Attempt ${attempt} validation failed for mode ${mode}:`, validationResult.errors);
        if (attempt <= maxRetries) {
          console.warn(`Retrying analysis generation due to validation failure...`);
        }
      }
    }

    if (!validationResult.isValid) {
      throw new Error(`Analysis for mode '${mode}' failed integrity checks after ${attempt} attempts: ${validationResult.errors.join('; ')}`);
    }

    const enrichedResult = {
      analysisId: 'ana_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
      analyzedAt: new Date().toISOString(),
      promptVersion: '1.3.0-multitool',
      modelIdentifier: actualModel,
      requestedModel: requestedModel,
      actualModel: actualModel,
      fallbackOccurred: fallbackOccurred,
      fallbackReason: fallbackReason,
      editorialRulesApplied: true,
      mode,
      ...parsed,
    };

    return jsonResponse({ success: true, result: enrichedResult });
  } catch (err: any) {
    console.error('Analysis error:', err);
    return jsonResponse({
      error: err.message || 'An error occurred during Gemini product analysis.',
      details: err.stack,
    }, 500);
  }
}
