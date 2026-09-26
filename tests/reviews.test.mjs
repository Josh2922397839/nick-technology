import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleReviews } from '../lib/reviews.js';

function environment() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  return { ADMIN_SECRET: 'test-only-key', nick_technology_db: {
    prepare(query) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async all() { return { results: sql.prepare(query).all(...values) }; },
        async run() { const result = sql.prepare(query).run(...values); return { meta: { changes: result.changes } }; }
      };
    }
  } };
}
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZ0AAAAASUVORK5CYII=';
const body = { name: 'Test Customer', rating: 5, text: 'Thank you for fixing my laptop.' };
const request = (method, data, headers = {}, path = '/api/reviews') => new Request('https://example.com' + path, { method, headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });

test('reviews and multiple photos persist, reload, and delete only with the valid key', async () => {
  const env = environment();
  const response = await handleReviews(request('POST', { ...body, images: [photo, photo, photo] }), env);
  assert.equal(response.status, 201);
  const { review } = await response.json();
  const loaded = await (await handleReviews(request('GET'), env)).json();
  assert.equal(loaded.length, 1);
  assert.deepEqual(loaded[0].images, [photo, photo, photo]);
  assert.equal((await handleReviews(request('DELETE', undefined, { Authorization: 'Bearer wrong-key' }, `/api/reviews?id=${review.id}`), env)).status, 401);
  assert.equal((await (await handleReviews(request('GET'), env)).json()).length, 1);
  assert.equal((await handleReviews(request('DELETE', undefined, { Authorization: 'Bearer test-only-key' }, `/api/reviews?id=${review.id}`), env)).status, 200);
  assert.equal((await (await handleReviews(request('GET'), env)).json()).length, 0);
});
test('existing single-photo payloads remain compatible', async () => {
  const env = environment();
  assert.equal((await handleReviews(request('POST', { ...body, image: photo }), env)).status, 201);
  const loaded = await (await handleReviews(request('GET'), env)).json();
  assert.equal(loaded[0].image, photo);
  assert.deepEqual(loaded[0].images, [photo]);
});
test('admin unlock verifies the key and never reveals it', async () => {
  const env = environment();
  assert.equal((await handleReviews(request('GET', undefined, {}, '/api/reviews/admin'), env)).status, 401);
  const response = await handleReviews(request('GET', undefined, { Authorization: 'Bearer test-only-key' }, '/api/reviews/admin'), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
});
test('invalid review values and unsafe or excessive photos are rejected', async () => {
  const env = environment();
  for (const invalid of [{ name: 25 }, { rating: 4.5 }, { rating: '5bad' }, { text: {} }, { images: [photo, photo, photo, photo] }, { images: ['data:image/svg+xml;base64,PHN2Zz4='] }, { images: ['data:image/png;base64,SGVsbG8='] }, { images: [photo + 'x'.repeat(250000)] }, { images: ['https://example.com/image.png'] }, { website: 'bot.example' }]) {
    assert.equal((await handleReviews(request('POST', { ...body, ...invalid }), env)).status, 400);
  }
  assert.equal((await (await handleReviews(request('GET'), env)).json()).length, 0);
});
test('malformed JSON and oversized payloads return useful client errors', async () => {
  const env = environment();
  assert.equal((await handleReviews(new Request('https://example.com/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' }), env)).status, 400);
  assert.equal((await handleReviews(request('POST', { ...body, text: 'x'.repeat(800000) }), env)).status, 413);
});
test('Turnstile is required when configured and failed checks cannot save reviews', async () => {
  const env = { ...environment(), TURNSTILE_SECRET_KEY: 'test-secret' };
  assert.equal((await handleReviews(request('POST', body), env)).status, 400);
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ success: false });
    assert.equal((await handleReviews(request('POST', { ...body, turnstileToken: 'invalid' }), env)).status, 400);
    globalThis.fetch = async () => Response.json({ success: true });
    assert.equal((await handleReviews(request('POST', { ...body, turnstileToken: 'valid' }), env)).status, 201);
  } finally { globalThis.fetch = originalFetch; }
});
test('unknown endpoints and unsupported methods do not invoke database writes', async () => {
  const env = environment();
  assert.equal((await handleReviews(request('PUT', body), env)).status, 405);
  assert.equal((await handleReviews(request('GET', undefined, {}, '/api/missing'), env)).status, 404);
  assert.equal((await handleReviews(request('DELETE', undefined, { Authorization: 'Bearer test-only-key' }, '/api/reviews?id=missing'), env)).status, 404);
});
