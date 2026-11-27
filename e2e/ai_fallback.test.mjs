// Handler-level tests for the Groq -> OpenRouter fallback. Fake transport and fake keys only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEdge } from './helpers/edgeHarness.mjs';

const QA = 'nmourao+pfpqa1031@mail.grokbot.com';
const auth = (isPremium = true) => ({ userId: '10000000-0000-4000-8000-000000000001', email: QA, isPremium, isAdmin: false });
const request = (body) => new Request('https://qa.invalid', { method: 'POST', body: JSON.stringify(body) });
const ok = (content) => Response.json({ choices: [{ message: { content } }] });
const GROQ = 'https://api.groq.com/openai/v1/chat/completions';
const OR = 'https://openrouter.ai/api/v1/chat/completions';
const ENV = { OPENROUTER_API_KEY: 'LOCAL_FAKE_OR', OPENROUTER_MODELS: 'fake/a:free,fake/b:free' };

function transport(groq, or = () => ok('do OpenRouter')) {
  const calls = [];
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body); calls.push({ url: String(url), body });
    return String(url) === GROQ ? groq(body, calls.length) : or(body, calls.length);
  };
  return { fetch, calls };
}

const simple = [
  ['generate-prompt', { objective: 'QA objetivo' }, (j) => assert.equal(j.prompt, 'do OpenRouter')],
  ['quick-prompt', { request: 'QA pedido' }, (j) => { assert.equal(j.prompt, 'do OpenRouter'); assert.ok('language' in j); }],
  ['generate-hooks', { tema: 'QA tema' }, (j) => { assert.equal(j.hooks, 'do OpenRouter'); assert.equal(j.maxHooks, 5); }],
  ['generate-pack-preview', { packSlug: 'tiktok', tema: 'QA tema' }, (j) => { assert.deepEqual(j.results, ['do OpenRouter']); assert.equal(j.maxAvailable, 5); }],
];

for (const [fn, body, check] of simple) {
  test(`${fn}: Groq 429 falls back to OpenRouter with the same JSON contract`, async () => {
    const t = transport(() => new Response(null, { status: 429 }));
    const handler = await loadEdge(`supabase/functions/${fn}/index.ts`, { auth: auth(true), fetch: t.fetch, env: ENV });
    const res = await handler(request(body));
    assert.equal(res.status, 200);
    const json = await res.json();
    check(json);
    assert.equal('provider' in json, false);
    assert.deepEqual(t.calls.map((c) => c.url), [GROQ, OR]);
    assert.equal(t.calls[1].body.reasoning_effort, undefined);
  });

  test(`${fn}: Groq and OpenRouter both rate limited keeps the existing 429`, async () => {
    const t = transport(() => new Response(null, { status: 429 }), () => new Response(null, { status: 429 }));
    const handler = await loadEdge(`supabase/functions/${fn}/index.ts`, { auth: auth(true), fetch: t.fetch, env: ENV });
    const res = await handler(request(body));
    assert.equal(res.status, 429);
    const text = await res.text();
    assert.doesNotMatch(text, /openrouter|groq|LOCAL_FAKE/i);
  });
}

test('generate-hooks keeps temperature and token budget on both providers', async () => {
  const t = transport(() => new Response(null, { status: 503 }));
  const handler = await loadEdge('supabase/functions/generate-hooks/index.ts', { auth: auth(true), fetch: t.fetch, env: ENV });
  assert.equal((await handler(request({ tema: 'QA' }))).status, 200);
  assert.equal(t.calls[0].body.temperature, 0.8); assert.equal(t.calls[0].body.max_completion_tokens, 1500);
  assert.equal(t.calls[1].body.temperature, 0.8); assert.equal(t.calls[1].body.max_tokens, 1500);
});

test('generate-prompt: no AI keys returns the generic 500 without secret names', async () => {
  const handler = await loadEdge('supabase/functions/generate-prompt/index.ts', { auth: auth(true), fetch: async () => { throw new Error('no network'); }, env: { GROQ_API_KEY: undefined } });
  const res = await handler(request({ objective: 'QA' }));
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'API key não configurada' });
});

test('test-prompts: Groq 429 on one branch, OpenRouter answers it, pair succeeds', async () => {
  const t = transport((body) => (body.messages[1].content === 'B' ? new Response(null, { status: 429 }) : ok('Groq A')), () => ok('OR B'));
  const handler = await loadEdge('supabase/functions/test-prompts/index.ts', { auth: auth(true), fetch: t.fetch, env: ENV });
  const res = await handler(request({ promptA: 'A', promptB: 'B' }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { responseA: 'Groq A', responseB: 'OR B' });
});

test('test-prompts: one branch exhausts every provider, the pair fails with 429', async () => {
  const t = transport((body) => (body.messages[1].content === 'B' ? new Response(null, { status: 429 }) : ok('Groq A')), () => new Response(null, { status: 503 }));
  const handler = await loadEdge('supabase/functions/test-prompts/index.ts', { auth: auth(true), fetch: t.fetch, env: ENV });
  assert.equal((await handler(request({ promptA: 'A', promptB: 'B' }))).status, 429);
});

test('generate-prompt: empty Groq content goes to OpenRouter, empty first model goes to the next', async () => {
  const t = transport(() => ok(''), (_b, n) => (n === 2 ? ok('') : ok('modelo B')));
  const handler = await loadEdge('supabase/functions/generate-prompt/index.ts', { auth: auth(true), fetch: t.fetch, env: ENV });
  const res = await handler(request({ objective: 'QA' }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).prompt, 'modelo B');
  assert.deepEqual(t.calls.map((c) => c.body.model), ['openai/gpt-oss-120b', 'fake/a:free', 'fake/b:free']);
});
