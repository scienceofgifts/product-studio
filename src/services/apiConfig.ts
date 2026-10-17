/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility function to resolve the target API URL for backend or Cloudflare Worker endpoints.
 * - In production (or when VITE_WORKER_API_URL is configured), routes requests to the Worker URL.
 * - In local development (when VITE_WORKER_API_URL is unset/empty), uses relative /api/* paths.
 */
export function getApiUrl(endpoint: string): string {
  const workerBaseUrl = (import.meta.env.VITE_WORKER_API_URL || '').trim();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (workerBaseUrl) {
    const cleanBase = workerBaseUrl.replace(/\/+$/, '');
    return `${cleanBase}${normalizedEndpoint}`;
  }

  return normalizedEndpoint;
}
