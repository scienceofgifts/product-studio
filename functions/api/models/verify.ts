/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  jsonResponse,
  handleOptionsRequest,
  getGeminiClient,
  ALLOWED_MODELS
} from '../../../src/services/geminiServerUtils.js';

interface Env {
  GEMINI_API_KEY?: string;
}

export async function onRequestOptions() {
  return handleOptionsRequest();
}

export async function onRequestPost(context: { env: Env }) {
  try {
    const ai = getGeminiClient(context.env.GEMINI_API_KEY);
    const results: Record<string, { available: boolean; latencyMs?: number; error?: string }> = {};

    await Promise.allSettled(
      ALLOWED_MODELS.map(async (model) => {
        const start = Date.now();
        try {
          const pingPromise = ai.models.generateContent({
            model,
            contents: 'ping',
          });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Ping timed out after 8000ms')), 8000)
          );
          await Promise.race([pingPromise, timeoutPromise]);
          results[model] = {
            available: true,
            latencyMs: Date.now() - start,
          };
        } catch (e: any) {
          results[model] = {
            available: false,
            latencyMs: Date.now() - start,
            error: e.message?.slice(0, 150) || 'Unavailable',
          };
        }
      })
    );

    const lastVerified = new Date().toISOString();

    return jsonResponse({
      success: true,
      lastVerified,
      results,
    });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Failed to verify models.' }, 500);
  }
}
