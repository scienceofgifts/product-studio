/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { onRequest } from '../functions/api/[[path]]';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runPagesFunctionsTests() {
  console.log('Running Cloudflare Pages Functions Unit Test Suite...\n');

  const mockEnv = {
    GEMINI_API_KEY: 'test-mock-gemini-key',
  };

  // Test 1: GET /api/health
  {
    const req = new Request('https://example.com/api/health', { method: 'GET' });
    const res = await onRequest({ request: req, env: mockEnv } as any);
    assert(res.status === 200, 'Health check should return status 200');
    const json: any = await res.json();
    assert(json.status === 'ok', 'Health check status should be ok');
    assert(json.hasApiKey === true, 'Health check should register API key presence');
    assert(json.runtime === 'cloudflare-pages-functions', 'Health check should report pages functions runtime');
    console.log('✓ Test 1 passed: GET /api/health returns 200 and runtime metadata.');
  }

  // Test 2: GET /api/models
  {
    const req = new Request('https://example.com/api/models', { method: 'GET' });
    const res = await onRequest({ request: req, env: mockEnv } as any);
    assert(res.status === 200, 'Get models should return 200');
    const json: any = await res.json();
    assert(Array.isArray(json.allowedModels), 'allowedModels must be an array');
    assert(json.allowedModels.includes('gemini-3.5-flash-lite'), 'allowedModels must include default model');
    console.log('✓ Test 2 passed: GET /api/models returns model catalog.');
  }

  // Test 3: POST /api/extract-url validation
  {
    const req = new Request('https://example.com/api/extract-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await onRequest({ request: req, env: mockEnv } as any);
    assert(res.status === 400, 'Missing URL should return status 400');
    const json: any = await res.json();
    assert(Boolean(json.error), 'Response should contain error message');
    console.log('✓ Test 3 passed: POST /api/extract-url rejects empty body with 400.');
  }

  // Test 4: POST /api/analyze validation
  {
    const req = new Request('https://example.com/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await onRequest({ request: req, env: mockEnv } as any);
    assert(res.status === 400, 'Missing details and image should return status 400');
    console.log('✓ Test 4 passed: POST /api/analyze validates missing inputs with 400.');
  }

  // Test 5: POST /api/compare validation
  {
    const req = new Request('https://example.com/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productA: { id: 'p1' } }),
    });
    const res = await onRequest({ request: req, env: mockEnv } as any);
    assert(res.status === 400, 'Missing productB should return status 400');
    console.log('✓ Test 5 passed: POST /api/compare validates missing products with 400.');
  }

  // Test 6: Unknown endpoint returns 404
  {
    const req = new Request('https://example.com/api/unknown-route', { method: 'GET' });
    const res = await onRequest({ request: req, env: mockEnv } as any);
    assert(res.status === 404, 'Unknown API route should return 404');
    console.log('✓ Test 6 passed: Unknown route returns 404 cleanly.');
  }

  console.log('\nAll Cloudflare Pages Functions tests completed successfully!');
}

runPagesFunctionsTests().catch((err) => {
  console.error('Pages Functions test failed:', err);
  process.exit(1);
});
