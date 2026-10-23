/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  jsonResponse,
  handleOptionsRequest,
  ALLOWED_MODELS,
  PREFERRED_DEFAULT_MODEL,
  PREFERRED_FALLBACK_MODEL
} from '../../../src/services/geminiServerUtils.js';

interface Env {
  GEMINI_API_KEY?: string;
}

export async function onRequestOptions() {
  return handleOptionsRequest();
}

export async function onRequestGet(_context: { env: Env }) {
  return jsonResponse({
    defaultModel: PREFERRED_DEFAULT_MODEL,
    fallbackModel: PREFERRED_FALLBACK_MODEL,
    allowedModels: ALLOWED_MODELS,
    verification: {
      lastVerified: null,
      results: {},
    },
  });
}
