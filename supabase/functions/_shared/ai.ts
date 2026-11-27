// Shared AI chat helper: Groq first (GROQ_API_KEY, AI_MODEL, default openai/gpt-oss-120b),
// then OpenRouter free models (OPENROUTER_API_KEY, OPENROUTER_MODELS) as a fallback when Groq
// is rate limited, out of credits, too slow or down.
// Logs only provider, model and numeric status. Never logs keys, prompts or responses.

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
export interface ChatResult { content: string; provider: 'groq' | 'openrouter' }
export type AiErrorReason = 'http' | 'empty' | 'timeout' | 'network' | 'config';
export class AiError extends Error {
  constructor(public status: number, msg: string, public reason: AiErrorReason = 'http') { super(msg); this.name = 'AiError'; }
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** Tests only: go straight to OpenRouter. */
  skipGroq?: boolean;
  /** Per-attempt timeout. Default 55s. */
  timeoutMs?: number;
  /** Upper bound for all attempts together (Groq plus every OpenRouter model). Default 140s. */
  totalTimeoutMs?: number;
}

export const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
export const DEFAULT_OPENROUTER_MODELS = 'nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-26b-a4b-it:free,baidu/ernie-5.5-flash-preview:free';
const DEFAULT_TIMEOUT_MS = 55_000;
const DEFAULT_TOTAL_TIMEOUT_MS = 140_000;

/** Statuses where another provider/model may succeed: rate limit, payload too large, out of credits, request timeout, 5xx. */
export function isFallbackStatus(status: number): boolean {
  return status === 402 || status === 408 || status === 413 || status === 429 || status >= 500;
}

const env = (k: string): string | undefined => {
  const v = Deno.env.get(k);
  return v && v.trim() ? v.trim() : undefined;
};

/** True if at least one AI provider key is configured. */
export function hasAiProvider(): boolean {
  return Boolean(env('GROQ_API_KEY') || env('OPENROUTER_API_KEY'));
}

export function openRouterModels(): string[] {
  return (env('OPENROUTER_MODELS') ?? DEFAULT_OPENROUTER_MODELS).split(',').map((m) => m.trim()).filter(Boolean);
}

async function callOpenAiCompatible(url: string, key: string, body: Record<string, unknown>, timeoutMs: number, extraHeaders: Record<string, string> = {}): Promise<string> {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, Math.max(1, timeoutMs));
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) { await res.text().catch(() => ''); throw new AiError(res.status, `upstream ${res.status}`); }
    const data = await res.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content;
    // Some free/reasoning models return 200 with an empty content: treat it as a failure.
    if (typeof content !== 'string' || !content.trim()) throw new AiError(502, 'empty response', 'empty');
    return content;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (timedOut) throw new AiError(504, 'upstream timeout', 'timeout');
    throw new AiError(504, 'upstream unreachable', 'network');
  } finally { clearTimeout(timer); }
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
  const groqKey = env('GROQ_API_KEY');
  const orKey = env('OPENROUTER_API_KEY');
  if (!groqKey && !orKey) throw new AiError(500, 'no AI provider configured', 'config');

  const perAttempt = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + (opts.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS);
  const budget = () => Math.min(perAttempt, deadline - Date.now());
  const sampling = {
    ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
  };

  let groqErr: AiError | null = null;
  let lastErr: AiError | null = null;

  if (groqKey && !opts.skipGroq) {
    const model = env('AI_MODEL') ?? DEFAULT_GROQ_MODEL;
    const effort = env('AI_REASONING_EFFORT');
    try {
      const content = await callOpenAiCompatible(GROQ_URL, groqKey, {
        model,
        ...(effort ? { reasoning_effort: effort } : {}),
        messages,
        ...sampling,
        ...(opts.maxTokens ? { max_completion_tokens: opts.maxTokens } : {}),
      }, budget());
      return { content, provider: 'groq' };
    } catch (e) {
      groqErr = e as AiError;
      console.warn('ai provider failed', 'groq', model, groqErr.status);
      // Bad request, bad key, forbidden and similar will not get better on another provider.
      if (!isFallbackStatus(groqErr.status)) throw groqErr;
    }
  }

  if (orKey) {
    for (const model of openRouterModels()) {
      const remaining = budget();
      if (remaining <= 0) { lastErr = new AiError(504, 'upstream timeout', 'timeout'); break; }
      try {
        // Groq-only parameters (reasoning_effort, max_completion_tokens) are not sent to OpenRouter.
        const content = await callOpenAiCompatible(OPENROUTER_URL, orKey, {
          model, messages, ...sampling,
          ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        }, remaining, { 'HTTP-Referer': 'https://promptforgepro.me', 'X-Title': 'PromptForge Pro' });
        return { content, provider: 'openrouter' };
      } catch (e) {
        lastErr = e as AiError;
        console.warn('ai provider failed', 'openrouter', model, lastErr.status);
      }
    }
  }

  // Report the primary provider's failure when there is one, so callers keep their existing
  // 429/402/500 messages; otherwise the last OpenRouter failure.
  throw groqErr ?? lastErr ?? new AiError(500, 'no AI provider configured', 'config');
}
