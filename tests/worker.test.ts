/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import worker, { validateAndNormalizeProductUrl, Env } from '../worker/index';

console.log('Running Cloudflare Worker Test Suite...\n');

async function runTests() {
  // Test 1: SSRF URL Validation
  console.log('Test 1: SSRF URL Validation for /api/extract-url...');
  
  const blockedUrls = [
    'http://localhost:3000/internal',
    'http://127.0.0.1/secret',
    'http://0.0.0.0/',
    'http://10.0.0.1/admin',
    'http://172.16.0.1/status',
    'http://192.168.1.1/router',
    'http://169.254.169.254/latest/meta-data/',
    'file:///etc/passwd',
    'gopher://127.0.0.1:70/',
    'ftp://example.com/file.txt',
    'http://app.internal/data',
    'http://server.local/debug',
  ];

  for (const url of blockedUrls) {
    const res = validateAndNormalizeProductUrl(url);
    assert.strictEqual(res.valid, false, `Expected ${url} to be rejected for SSRF protection`);
    assert.ok(res.error, `Expected error message for rejected URL ${url}`);
  }

  const validUrl = 'https://example.com/product/history-hoodie-123';
  const validRes = validateAndNormalizeProductUrl(validUrl);
  assert.strictEqual(validRes.valid, true, 'Expected valid https URL to pass validation');
  assert.strictEqual(validRes.url?.href, validUrl);
  console.log('✓ SSRF URL validation test passed.\n');

  // Test 2: CORS Preflight OPTIONS
  console.log('Test 2: CORS Preflight OPTIONS handling...');
  const optionsReq = new Request('https://designdna-api.scienceofgifts.workers.dev/api/analyze', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://scienceofgifts.pages.dev',
      'Access-Control-Request-Method': 'POST',
    },
  });
  const mockEnv: Env = { ALLOWED_ORIGIN: 'https://scienceofgifts.pages.dev' };
  const optionsRes = await worker.fetch(optionsReq, mockEnv);
  assert.strictEqual(optionsRes.status, 204);
  assert.strictEqual(optionsRes.headers.get('Access-Control-Allow-Origin'), 'https://scienceofgifts.pages.dev');
  assert.ok(optionsRes.headers.get('Access-Control-Allow-Methods')?.includes('POST'));
  console.log('✓ CORS preflight OPTIONS test passed.\n');

  // Test 3: GET /api/health
  console.log('Test 3: GET /api/health...');
  const healthReq = new Request('https://designdna-api.scienceofgifts.workers.dev/api/health', { method: 'GET' });
  const healthRes = await worker.fetch(healthReq, { GEMINI_API_KEY: 'mock-key' });
  assert.strictEqual(healthRes.status, 200);
  const healthData: any = await healthRes.json();
  assert.strictEqual(healthData.status, 'ok');
  assert.strictEqual(healthData.hasApiKey, true);
  assert.ok(Array.isArray(healthData.allowedModels));
  console.log('✓ GET /api/health test passed.\n');

  // Test 4: GET /api/models
  console.log('Test 4: GET /api/models...');
  const modelsReq = new Request('https://designdna-api.scienceofgifts.workers.dev/api/models', { method: 'GET' });
  const modelsRes = await worker.fetch(modelsReq, {});
  assert.strictEqual(modelsRes.status, 200);
  const modelsData: any = await modelsRes.json();
  assert.ok(modelsData.defaultModel);
  assert.ok(Array.isArray(modelsData.allowedModels));
  console.log('✓ GET /api/models test passed.\n');

  // Test 5: Missing API Key Protection
  console.log('Test 5: Missing API Key error on protected routes...');
  const protectedReq = new Request('https://designdna-api.scienceofgifts.workers.dev/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'full' }),
  });
  const noKeyRes = await worker.fetch(protectedReq, {});
  assert.strictEqual(noKeyRes.status, 500);
  const noKeyData: any = await noKeyRes.json();
  assert.ok(noKeyData.error?.includes('GEMINI_API_KEY is not configured'));
  console.log('✓ Missing API Key protection test passed.\n');

  // Test 6: Request Validation on /api/analyze, /api/extract-url, /api/compare, /api/title-laboratory/generate-more
  console.log('Test 6: Request Body Validation...');
  const envWithKey: Env = { GEMINI_API_KEY: 'test-key' };

  // /api/analyze without payload
  const emptyAnalyzeReq = new Request('https://designdna-api.scienceofgifts.workers.dev/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const emptyAnalyzeRes = await worker.fetch(emptyAnalyzeReq, envWithKey);
  assert.strictEqual(emptyAnalyzeRes.status, 400);

  // /api/extract-url without url
  const emptyExtractReq = new Request('https://designdna-api.scienceofgifts.workers.dev/api/extract-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const emptyExtractRes = await worker.fetch(emptyExtractReq, envWithKey);
  assert.strictEqual(emptyExtractRes.status, 400);

  // /api/compare without productA/productB
  const emptyCompareReq = new Request('https://designdna-api.scienceofgifts.workers.dev/api/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const emptyCompareRes = await worker.fetch(emptyCompareReq, envWithKey);
  assert.strictEqual(emptyCompareRes.status, 400);

  // /api/title-laboratory/generate-more without details
  const emptyTitlesReq = new Request('https://designdna-api.scienceofgifts.workers.dev/api/title-laboratory/generate-more', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const emptyTitlesRes = await worker.fetch(emptyTitlesReq, envWithKey);
  assert.strictEqual(emptyTitlesRes.status, 400);

  console.log('✓ Request body validation tests passed.\n');

  // Test 7: 404 for unknown endpoints
  console.log('Test 7: Unknown route 404 handling...');
  const unknownReq = new Request('https://designdna-api.scienceofgifts.workers.dev/api/unknown-endpoint', {
    method: 'GET',
  });
  const unknownRes = await worker.fetch(unknownReq, envWithKey);
  assert.strictEqual(unknownRes.status, 404);
  console.log('✓ 404 route handling test passed.\n');

  console.log('All Cloudflare Worker tests completed successfully!');
}

runTests().catch((err) => {
  console.error('Worker Test Suite Failed:', err);
  process.exit(1);
});
