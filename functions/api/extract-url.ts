/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  jsonResponse,
  handleOptionsRequest
} from '../../src/services/geminiServerUtils.js';
import { fetchAndExtractProductFacts } from '../../src/services/productFactsService.js';

interface Env {
  GEMINI_API_KEY?: string;
}

export async function onRequestOptions() {
  return handleOptionsRequest();
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const body = await context.request.json() as { url?: string };
    const url = body?.url;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return jsonResponse({ error: 'A valid URL is required.' }, 400);
    }

    const facts = await fetchAndExtractProductFacts(url.trim());
    return jsonResponse({ success: true, facts });
  } catch (err: any) {
    console.error('URL extraction error:', err);
    return jsonResponse({
      error: err.message || 'Failed to extract product facts from URL.',
    }, 500);
  }
}
