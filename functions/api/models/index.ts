/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  handleOptionsRequest,
  ALLOWED_MODELS,
  PREFERRED_DEFAULT_MODEL,
  PREFERRED_FALLBACK_MODEL,
  Env
} from '../../_common.js';

export async function onRequestOptions() {
  return handleOptionsRequest();
}

export async function onRequestGet(_context: { env: Env }) {
  return Response.json({
    defaultModel: PREFERRED_DEFAULT_MODEL,
    fallbackModel: PREFERRED_FALLBACK_MODEL,
    allowedModels: ALLOWED_MODELS,
    verification: {
      lastVerified: null,
      results: {},
    },
  });
}
