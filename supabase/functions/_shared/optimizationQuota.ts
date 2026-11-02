// No prompt text is persisted. The trusted handler computes identity, never the client.
export type QuotaRow = { allowed: boolean; used: number; optimization_limit: number | null; token: string | null; reason: string | null; daily_used: number; daily_limit: number | null; quota_day: string; resets_at: string };
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
export async function promptFingerprint(prompt: string): Promise<string> {
  const normalized = prompt.normalize('NFC').replace(/\r\n?/g, '\n').trim();
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
export async function withOptimizationQuota(options: { userId: string; prompt: string; rpc: Rpc; headers: Record<string, string> }, operation: () => Promise<Response>): Promise<Response> {
  const { userId, prompt, rpc, headers } = options;
  const hash = await promptFingerprint(prompt);
  const reply = (body: unknown, status: number) => Response.json(body, { status, headers });
  const { data, error } = await rpc('reserve_prompt_optimization', { _user_id: userId, _prompt_hash: hash });
  const row = (Array.isArray(data) ? data[0] : null) as QuotaRow | null;
  if (error || !row) return reply({ error: 'Não foi possível verificar o limite. Tenta novamente. / Could not verify usage.', code: 'QUOTA_UNAVAILABLE' }, 503);
  const usage = { used: row.used, limit: row.optimization_limit, dailyUsed: row.daily_used, dailyLimit: row.daily_limit, day: row.quota_day, resetsAt: row.resets_at };
  if (!row.allowed || !row.token) {
    const busy = row.reason === 'BUSY' || row.reason === 'DAILY_BUSY';
    const daily = row.reason === 'DAILY_LIMIT' || row.reason === 'DAILY_BUSY';
    const message = row.reason === 'DAILY_LIMIT'
      ? 'Limite diário de 20 otimizações concluídas atingido. Renova à meia-noite de Lisboa. / Daily optimization limit reached; resets at midnight Lisbon time.'
      : row.reason === 'DAILY_BUSY' ? 'Há otimizações em curso a ocupar a capacidade diária. Tenta novamente. / Daily capacity reserved by ongoing optimizations.'
      : busy ? 'Já existe uma otimização em curso para este prompt. / Optimization in progress.'
      : 'Limite de 3 otimizações por prompt atingido. / Per-prompt optimization limit reached.';
    return reply({ error: message, code: daily ? (busy ? 'OPTIMIZATION_DAILY_BUSY' : 'OPTIMIZATION_DAILY_LIMIT') : (busy ? 'OPTIMIZATION_BUSY' : 'OPTIMIZATION_LIMIT'), optimizationUsage: usage }, busy ? 409 : 429);
  }
  let settled = false;
  try {
    const response = await operation();
    if (!response.ok) return response;
    const payload = await response.json();
    // Treat incomplete/invalid AI results as a failure, not a paid use.
    if (!payload?.score || !Array.isArray(payload.optimizations) || payload.optimizations.length === 0 || payload.optimizations.some((o: { content?: unknown }) => typeof o?.content !== 'string' || !o.content.trim())) {
      return reply({ error: 'Resposta inválida da IA. / Invalid AI response.' }, 502);
    }
    const finish = await rpc('finish_prompt_optimization', { _user_id: userId, _prompt_hash: hash, _token: row.token, _success: true });
    const done = (Array.isArray(finish.data) ? finish.data[0] : null) as { committed: boolean; used: number; daily_used: number } | null;
    if (finish.error || !done?.committed) return reply({ error: 'Não foi possível confirmar a otimização. / Could not confirm optimization.', code: 'QUOTA_UNAVAILABLE' }, 503);
    settled = true;
    return reply({ ...payload, optimizationUsage: { ...usage, used: done.used, dailyUsed: done.daily_used } }, 200);
  } finally {
    if (!settled) {
      // Exact token makes cleanup idempotent and prevents releasing a newer request.
      try { await rpc('finish_prompt_optimization', { _user_id: userId, _prompt_hash: hash, _token: row.token, _success: false }); } catch { /* Reservation expires automatically. */ }
    }
  }
}
