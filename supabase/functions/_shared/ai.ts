// Shared AI chat helper: Groq first (free key, AI_MODEL, default openai/gpt-oss-120b),
// then OpenRouter free models as a fallback when Groq is rate limited or down.
// Never logs keys or prompt contents.

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
export interface ChatResult { content: string; provider: 'groq' | 'openrouter' }
export class AiError extends Error { constructor(public status: number, msg: string) { super(msg); } }

async function callOpenAiCompatible(url: string, key: string, body: Record<string, unknown>, extraHeaders: Record<string, string> = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) { await res.text().catch(() => ''); throw new AiError(res.status, `upstream ${res.status}`); }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') throw new AiError(502, 'empty response');
    return content;
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError(504, 'upstream unreachable');
  } finally { clearTimeout(timer); }
}

export async function chat(messages: ChatMessage[], opts: { temperature?: number; maxTokens?: number } = {}): Promise<ChatResult> {
  const groqKey = Deno.env.get('GROQ_API_KEY');
  const orKey = Deno.env.get('OPENROUTER_API_KEY');
  let lastErr: AiError | null = null;
  if (groqKey) {
    try {
      const content = await callOpenAiCompatible('https://api.groq.com/openai/v1/chat/completions', groqKey, {
        model: Deno.env.get('AI_MODEL') ?? 'openai/gpt-oss-120b',
        ...(Deno.env.get('AI_REASONING_EFFORT') ? { reasoning_effort: Deno.env.get('AI_REASONING_EFFORT') } : {}),
        messages,
        ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
        ...(opts.maxTokens ? { max_completion_tokens: opts.maxTokens } : {}),
      });
      return { content, provider: 'groq' };
    } catch (e) {
      lastErr = e as AiError;
      console.warn('groq failed, status', lastErr.status);
      // Client errors other than rate limits will not get better on another provider.
      if (lastErr.status >= 400 && lastErr.status < 500 && lastErr.status !== 429 && lastErr.status !== 413) throw lastErr;
    }
  }
  if (orKey) {
    const models = (Deno.env.get('OPENROUTER_MODELS') ?? 'openai/gpt-oss-120b:free,meta-llama/llama-3.3-70b-instruct:free').split(',').map((m) => m.trim()).filter(Boolean);
    for (const model of models) {
      try {
        const content = await callOpenAiCompatible('https://openrouter.ai/api/v1/chat/completions', orKey, {
          model, messages,
          ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
          ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        }, { 'HTTP-Referer': 'https://promptforgepro.me', 'X-Title': 'PromptForge Pro' });
        return { content, provider: 'openrouter' };
      } catch (e) { lastErr = e as AiError; console.warn('openrouter model failed, status', lastErr.status); }
    }
  }
  throw lastErr ?? new AiError(500, 'no AI provider configured');
}
