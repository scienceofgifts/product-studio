/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Default production worker URL for Science of Gifts Product Intelligence Studio API.
 */
export const DEFAULT_WORKER_API_URL = 'https://product-studio-api.scienceofgifts.workers.dev';

/**
 * Utility function to resolve the target API URL for backend or Cloudflare Worker endpoints.
 * - If VITE_WORKER_API_URL is configured (e.g. in Cloudflare Pages deployment), routes requests to that Worker URL.
 * - Otherwise (in local applet server environment or when VITE_WORKER_API_URL is unset/empty),
 *   uses relative /api/* paths to communicate directly with the local Express server.
 */
export function getApiUrl(endpoint: string): string {
  const envUrl = (import.meta.env.VITE_WORKER_API_URL || '').trim();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (envUrl) {
    const cleanBase = envUrl.replace(/\/+$/, '');
    return `${cleanBase}${normalizedEndpoint}`;
  }

  return normalizedEndpoint;
}

/**
 * Resilient fetch wrapper for API endpoints.
 * Executes fetch to getApiUrl(endpoint), falling back to relative endpoint if an external worker URL fails due to network error.
 */
export async function fetchApi(endpoint: string, init?: RequestInit): Promise<Response> {
  const targetUrl = getApiUrl(endpoint);
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    return await fetch(targetUrl, init);
  } catch (err: any) {
    if (targetUrl !== normalizedEndpoint) {
      console.warn(`Fetch to ${targetUrl} failed (${err.message}). Falling back to local relative endpoint ${normalizedEndpoint}.`);
      return await fetch(normalizedEndpoint, init);
    }
    throw err;
  }
}


