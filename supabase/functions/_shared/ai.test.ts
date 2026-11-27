// Unit tests for the Groq -> OpenRouter fallback in _shared/ai.ts.
// Uses a fake fetch and fake env values only. No real network calls, no real keys.
// Run: deno test --allow-env supabase/functions/_shared/ai.test.ts
import { assert, assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { AiError, chat, DEFAULT_OPENROUTER_MODELS, GROQ_URL, hasAiProvider, isFallbackStatus, OPENROUTER_URL } from './ai.ts';

type Call = { url: string; body: Record<string, unknown> };
type Reply = Response | 'network' | 'hang';

const ENV_KEYS = ['GROQ_API_KEY', 'OPENROUTER_API_KEY', 'OPENROUTER_MODELS', 'AI_MODEL', 'AI_REASONING_EFFORT'];
const ok = (content: unknown) => Response.json({ choices: [{ message: { content } }] });
const status = (s: number) => new Response('fake upstream body', { status: s });

async function withFakes(
  env: Record<string, string>,
  replies: (call: Call, i: number) => Reply,
  fn: (calls: Call[], logs: string[]) => Promise<void>,
) {
  const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, Deno.env.get(k)]));
  const savedFetch = globalThis.fetch;
  const savedWarn = console.warn;
  const calls: Call[] = [];
  const logs: string[] = [];
  for (const k of ENV_KEYS) Deno.env.delete(k);
  for (const [k, v] of Object.entries(env)) Deno.env.set(k, v);
  console.warn = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(input), body: JSON.parse(String(init?.body ?? '{}')) };
    calls.push(call);
    const r = replies(call, calls.length - 1);
    if (r === 'network') return Promise.reject(new TypeError('fake network down'));
    if (r === 'hang') {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    }
    return Promise.resolve(r);
  }) as typeof fetch;
  try { await fn(calls, logs); } finally {
    globalThis.fetch = savedFetch;
    console.warn = savedWarn;
    for (const k of ENV_KEYS) { const v = savedEnv[k]; if (v === undefined) Deno.env.delete(k); else Deno.env.set(k, v); }
  }
}

const BOTH = { GROQ_API_KEY: 'FAKE_GROQ_KEY', OPENROUTER_API_KEY: 'FAKE_OR_KEY', OPENROUTER_MODELS: 'fake/model-a:free,fake/model-b:free' };
const msgs = [{ role: 'user' as const, content: 'olá' }];
const groqThen = (groq: Reply, or: (i: number) => Reply = () => ok('resposta OR')) =>
  (c: Call, i: number) => (c.url === GROQ_URL ? groq : or(i));

Deno.test('Groq 200: provider groq, OpenRouter not called', async () => {
  await withFakes(BOTH, () => ok('resposta Groq'), async (calls) => {
    const r = await chat(msgs, { temperature: 0.8, maxTokens: 1500 });
    assertEquals(r, { content: 'resposta Groq', provider: 'groq' });
    assertEquals(calls.length, 1);
    assertEquals(calls[0].url, GROQ_URL);
    assertEquals(calls[0].body.max_completion_tokens, 1500);
    assertEquals(calls[0].body.temperature, 0.8);
  });
});

for (const s of [429, 402, 408, 413, 500, 503]) {
  Deno.test(`Groq ${s}: falls back to OpenRouter`, async () => {
    await withFakes(BOTH, groqThen(status(s)), async (calls) => {
      const r = await chat(msgs);
      assertEquals(r, { content: 'resposta OR', provider: 'openrouter' });
      assertEquals(calls.map((c) => c.url), [GROQ_URL, OPENROUTER_URL]);
      assertEquals(calls[1].body.model, 'fake/model-a:free');
    });
  });
}

Deno.test('Groq network error: falls back to OpenRouter', async () => {
  await withFakes(BOTH, groqThen('network'), async () => {
    assertEquals((await chat(msgs)).provider, 'openrouter');
  });
});

Deno.test('Groq timeout: aborts and falls back to OpenRouter', async () => {
  await withFakes(BOTH, groqThen('hang'), async (calls) => {
    const r = await chat(msgs, { timeoutMs: 20 });
    assertEquals(r.provider, 'openrouter');
    assertEquals(calls.length, 2);
  });
});

for (const s of [400, 401, 403, 422]) {
  Deno.test(`Groq ${s}: no fallback, error rethrown`, async () => {
    await withFakes(BOTH, groqThen(status(s)), async (calls) => {
      const e = await assertRejects(() => chat(msgs), AiError);
      assertEquals(e.status, s);
      assertEquals(calls.length, 1);
    });
  });
}

Deno.test('Empty content from OpenRouter model: tries the next model', async () => {
  await withFakes(BOTH, groqThen(status(429), (i) => (i === 1 ? ok('') : ok('do modelo B'))), async (calls) => {
    const r = await chat(msgs);
    assertEquals(r, { content: 'do modelo B', provider: 'openrouter' });
    assertEquals(calls.map((c) => c.body.model), [Deno.env.get('AI_MODEL') ?? 'openai/gpt-oss-120b', 'fake/model-a:free', 'fake/model-b:free']);
  });
});

Deno.test('Whitespace or non-string content counts as empty', async () => {
  await withFakes(BOTH, groqThen(ok('   '), (i) => (i === 1 ? ok(null) : ok('ok'))), async (calls) => {
    assertEquals((await chat(msgs)).content, 'ok');
    assertEquals(calls.length, 3);
  });
});

Deno.test('OpenRouter model error: tries the next model', async () => {
  await withFakes(BOTH, groqThen(status(500), (i) => (i === 1 ? status(404) : ok('B'))), async () => {
    assertEquals(await chat(msgs), { content: 'B', provider: 'openrouter' });
  });
});

Deno.test('Everything fails: controlled AiError with the Groq status', async () => {
  await withFakes(BOTH, groqThen(status(429), () => status(503)), async (calls) => {
    const e = await assertRejects(() => chat(msgs), AiError);
    assertEquals(e.status, 429);
    assertEquals(calls.length, 3);
  });
});

Deno.test('Everything empty: AiError reason empty', async () => {
  await withFakes(BOTH, () => ok(''), async () => {
    const e = await assertRejects(() => chat(msgs), AiError);
    assertEquals(e.status, 502);
    assertEquals(e.reason, 'empty');
  });
});

Deno.test('No keys: controlled config error, no fetch, no secret names', async () => {
  await withFakes({}, () => ok('x'), async (calls) => {
    assertEquals(hasAiProvider(), false);
    const e = await assertRejects(() => chat(msgs), AiError);
    assertEquals(e.status, 500);
    assertEquals(e.reason, 'config');
    assert(!/KEY/.test(e.message));
    assertEquals(calls.length, 0);
  });
});

Deno.test('Only OpenRouter key: works without Groq', async () => {
  await withFakes({ OPENROUTER_API_KEY: 'FAKE_OR_KEY' }, () => ok('só OR'), async (calls) => {
    assertEquals(hasAiProvider(), true);
    assertEquals((await chat(msgs)).provider, 'openrouter');
    assertEquals(calls[0].body.model, DEFAULT_OPENROUTER_MODELS.split(',')[0]);
  });
});

Deno.test('skipGroq: Groq never called', async () => {
  await withFakes(BOTH, () => ok('OR'), async (calls) => {
    assertEquals((await chat(msgs, { skipGroq: true })).provider, 'openrouter');
    assert(calls.every((c) => c.url === OPENROUTER_URL));
  });
});

Deno.test('Groq-only params are not sent to OpenRouter', async () => {
  await withFakes({ ...BOTH, AI_REASONING_EFFORT: 'low', AI_MODEL: 'openai/gpt-oss-120b' }, groqThen(status(429)), async (calls) => {
    await chat(msgs, { maxTokens: 1500, temperature: 0.8 });
    assertEquals(calls[0].body.reasoning_effort, 'low');
    assertEquals(calls[1].body.reasoning_effort, undefined);
    assertEquals(calls[1].body.max_completion_tokens, undefined);
    assertEquals(calls[1].body.max_tokens, 1500);
    assertEquals(calls[1].body.temperature, 0.8);
  });
});

Deno.test('Default OpenRouter model list', () => {
  assertEquals(DEFAULT_OPENROUTER_MODELS, 'nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-26b-a4b-it:free,baidu/ernie-5.5-flash-preview:free');
});

Deno.test('Fallback triggers', () => {
  for (const s of [402, 408, 413, 429, 500, 502, 503, 504]) assert(isFallbackStatus(s), String(s));
  for (const s of [400, 401, 403, 404, 422]) assert(!isFallbackStatus(s), String(s));
});

Deno.test('Logs never contain keys, prompts or responses', async () => {
  await withFakes(BOTH, groqThen(status(429), () => status(500)), async (_calls, logs) => {
    await chat([{ role: 'user', content: 'SEGREDO_DO_PROMPT' }]).catch(() => {});
    const all = logs.join('\n');
    assert(logs.length > 0);
    for (const bad of ['FAKE_GROQ_KEY', 'FAKE_OR_KEY', 'SEGREDO_DO_PROMPT', 'fake upstream body']) assert(!all.includes(bad), bad);
  });
});
