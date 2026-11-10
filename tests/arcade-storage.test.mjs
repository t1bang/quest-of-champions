import { test } from 'node:test';
import assert from 'node:assert/strict';

const storageKeys = ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN', 'BLOB_READ_WRITE_TOKEN', 'ADMIN_KEY'];
let serial = 0;

async function call({ env = {}, request, response = {}, fetchImpl } = {}) {
  const saved = Object.fromEntries(storageKeys.map(key => [key, process.env[key]]));
  const oldFetch = globalThis.fetch;
  const requests = [];
  const res = {
    code: null, body: null, headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
  try {
    for (const key of storageKeys) delete process.env[key];
    Object.assign(process.env, env);
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      return fetchImpl ? fetchImpl(url, options) : { ok: true, json: async () => response };
    };
    const { default: handler } = await import(`../api/arcade.js?test=${serial++}`);
    await handler(request, res);
    return { ...res, requests };
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of storageKeys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test('unconfigured storage forwards join and preserves its response contract', async () => {
  const response = { pid: 'test-player', key: 'test-key', player: { name: 'Tester', tokens: 0 } };
  const result = await call({ request: { method: 'POST', query: { a: 'join' }, body: JSON.stringify({ name: 'Tester' }) }, response });
  assert.equal(result.code, 200);
  assert.deepEqual(result.body, response);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(result.requests.length, 1);
  const { url, options } = result.requests[0];
  assert.equal(new URL(url).pathname, '/rest/v1/rpc/bba_arcade');
  assert.equal(options.method, 'POST');
  assert.ok(options.headers.apikey);
  assert.ok(options.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(options.body), { p_action: 'join', p_body: { name: 'Tester' }, p_game: null });
});

test('GET board and comments forward game without changing the rows contract', async () => {
  for (const action of ['board', 'comments']) {
    const result = await call({ request: { method: 'GET', query: { a: action, game: 'guerilla' } }, response: { rows: [] } });
    assert.equal(result.code, 200);
    assert.deepEqual(result.body, { rows: [] });
    assert.deepEqual(JSON.parse(result.requests[0].options.body), { p_action: action, p_body: {}, p_game: 'guerilla' });
  }
});

test('Supabase authentication errors retain an actionable HTTP status', async () => {
  const result = await call({ request: { method: 'POST', query: { a: 'me' }, body: {} }, fetchImpl: async () => ({ ok: false, json: async () => ({ code: '28000', message: 'Sign in first' }) }) });
  assert.equal(result.code, 401);
  assert.deepEqual(result.body, { error: 'Sign in first' });
});

test('configured Redis still uses the existing Redis storage path', async () => {
  const result = await call({ env: { KV_REST_API_URL: 'https://redis.example', KV_REST_API_TOKEN: 'test-only' }, request: { method: 'GET', query: { a: 'board', game: 'guerilla' } }, fetchImpl: async () => ({ ok: true, json: async () => ({ result: JSON.stringify([{ name: 'Tester', badge: '', score: 40 }]) }) }) });
  assert.equal(result.code, 200);
  assert.deepEqual(result.body, { rows: [{ name: 'Tester', badge: '', score: 40 }] });
  assert.equal(result.requests[0].url, 'https://redis.example');
  assert.deepEqual(JSON.parse(result.requests[0].options.body), ['GET', 'bba:scores/guerilla']);
});

test('configured Blob retains legacy action guards rather than routing to Supabase', async () => {
  const result = await call({ env: { BLOB_READ_WRITE_TOKEN: 'test-only' }, request: { method: 'POST', query: { a: 'uncomment' }, body: {} } });
  assert.equal(result.code, 403);
  assert.deepEqual(result.body, { error: 'No' });
  assert.equal(result.requests.length, 0);
});

test('unsupported moderation does not forward a legacy admin credential', async () => {
  const result = await call({ request: { method: 'POST', query: { a: 'uncomment' }, body: { admin: 'test-only' } } });
  assert.equal(result.code, 501);
  assert.equal(result.requests.length, 0);
});

test('invalid methods, GET mutations, unknown actions and oversized requests never reach storage', async () => {
  for (const [request, code] of [
    [{ method: 'DELETE', query: { a: 'board' } }, 405],
    [{ method: 'GET', query: { a: 'join' } }, 405],
    [{ method: 'POST', query: { a: 'missing' }, body: {} }, 404],
    [{ method: 'POST', query: { a: 'join' }, body: { name: 'x'.repeat(33000) } }, 413],
  ]) {
    const result = await call({ request });
    assert.equal(result.code, code);
    assert.equal(result.requests.length, 0);
  }
});
