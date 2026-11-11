// "Executar": runs a prompt in-app and returns the AI answer as plain text.
// Daily quota per plan enforced here via consume_prompt_run (service role): Free 5, Pro 100, Premium 300.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { authenticateRequest, corsHeaders } from "../_shared/auth.ts";
import { outputLanguageRules, isEnglishLang } from '../_shared/ptpt.ts';
import { plainTextRules, toPlainText } from '../_shared/plaintext.ts';
import { chat, AiError } from '../_shared/ai.ts';
import { resolveTaskBrand, brandInstructions } from '../_shared/brand.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const { prompt, language: reqLanguage, peek, useBrand, brandId } = await req.json().catch(() => ({}));
    // Brand is opt-in here (pack templates send useBrand: true); the run answer then follows the brand.
    const brand = !peek && useBrand === true ? await resolveTaskBrand(auth.userId, { useBrand, brandId }) : null;
    // The language explicitly selected for this task takes precedence over the brand's default language.
    // Brand settings still supply tone, audience and other context, never a forced translation.
    const language = (typeof reqLanguage === 'string' && /^(en|pt)(?:-[a-z]{2})?$/i.test(reqLanguage.trim()))
      ? reqLanguage.trim().toLowerCase()
      : (brand?.language ?? 'pt');
    const en = isEnglishLang(language);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Quota check only (no AI call): lets the UI show "x of y left today".
    if (peek) {
      const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' });
      const [{ data: u }, { data: lim }] = await Promise.all([
        admin.from('prompt_run_usage').select('runs').eq('user_id', auth.userId).eq('day', day).maybeSingle(),
        admin.rpc('prompt_run_limit', { _user_id: auth.userId }),
      ]);
      return json({ used: u?.runs ?? 0, limit: lim ?? 5 });
    }

    const text = typeof prompt === 'string' ? prompt.trim() : '';
    if (!text) return json({ error: en ? 'The prompt is empty.' : 'O prompt está vazio.' }, 400);
    if (text.length > 12000) return json({ error: en ? 'The prompt is too long (max 12,000 characters).' : 'O prompt é demasiado longo (máx. 12 000 caracteres).' }, 400);

    const { data: q, error: qErr } = await admin.rpc('consume_prompt_run', { _user_id: auth.userId });
    if (qErr) { console.error('quota rpc failed'); return json({ error: en ? 'Could not check your daily limit.' : 'Não foi possível verificar o teu limite diário.' }, 500); }
    const quota = Array.isArray(q) ? q[0] : q;
    if (!quota?.allowed) {
      return json({
        error: en ? `Daily limit reached (${quota?.run_limit} runs). It resets at midnight, Lisbon time.` : `Limite diário atingido (${quota?.run_limit} execuções). Renova à meia-noite (hora de Lisboa).`,
        code: 'RUN_LIMIT', used: quota?.used, limit: quota?.run_limit,
      }, 429);
    }

    const system = (en
      ? 'You are a helpful assistant. Carry out the user\'s prompt directly and completely, as if it had been pasted into an AI chat. Do not comment on the prompt itself.'
      : 'És um assistente prestável. Executa o prompt do utilizador de forma direta e completa, como se tivesse sido colado num chat de IA. Não comentes o prompt em si.')
      + brandInstructions(brand, en, false) + outputLanguageRules(language) + plainTextRules(language);

    try {
      const r = await chat([{ role: 'system', content: system }, { role: 'user', content: text }], { maxTokens: 4096 });
      return json({ result: toPlainText(r.content), provider: r.provider, used: quota.used, limit: quota.run_limit, brand: brand ? { id: brand.id, name: brand.name } : null });
    } catch (e) {
      await admin.rpc('refund_prompt_run', { _user_id: auth.userId });
      const status = e instanceof AiError ? e.status : 500;
      console.error('run-prompt AI error', status);
      return json({
        error: status === 429
          ? (en ? 'The AI is busy right now. Try again in a few seconds.' : 'A IA está ocupada neste momento. Tenta novamente daqui a uns segundos.')
          : (en ? 'Could not run the prompt. Try again.' : 'Não foi possível executar o prompt. Tenta novamente.'),
      }, status === 429 ? 503 : 502);
    }
  } catch (_e) {
    console.error('run-prompt unexpected error');
    return json({ error: 'Erro inesperado / Unexpected error' }, 500);
  }
});
