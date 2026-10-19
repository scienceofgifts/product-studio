/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resolves API request URLs using VITE_WORKER_API_URL if configured,
 * falling back to relative paths for local development.
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = (import.meta.env.VITE_WORKER_API_URL as string | undefined) || '';
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return cleanBase ? `${cleanBase}${cleanEndpoint}` : cleanEndpoint;
}
