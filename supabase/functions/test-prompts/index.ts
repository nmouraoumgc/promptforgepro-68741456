import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, corsHeaders } from "../_shared/auth.ts";
import { outputLanguageRules, isEnglishLang } from '../_shared/ptpt.ts';
import { plainTextRules, toPlainText } from '../_shared/plaintext.ts';
import { chat, AiError, hasAiProvider } from '../_shared/ai.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;
    if (!auth.isPremium) {
      return new Response(JSON.stringify({ error: 'Esta funcionalidade requer o Pro. / Pro is required.', code: 'PRO_REQUIRED' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { promptA, promptB, language } = await req.json();
    const en = isEnglishLang(language);
    const systemPrompt = (en
      ? 'You are a helpful assistant. Answer clearly and concisely in English.'
      : 'És um assistente prestável. Responde de forma clara e concisa em português de Portugal.') + outputLanguageRules(language) + plainTextRules(language);

    if (!promptA || !promptB) {
      return new Response(
        JSON.stringify({ error: en ? 'Both prompts are required' : 'Ambos os prompts são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!hasAiProvider()) {
      console.error('AI provider not configured');
      return new Response(
        JSON.stringify({ error: en ? 'API key not configured' : 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Testing prompts A and B...');

    // Test both prompts in parallel. Each branch falls back to OpenRouter on its own,
    // so a Groq 429 on one branch does not fail the pair if OpenRouter can still answer.
    const run = (userPrompt: string) => chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]).then((r) => r.content).catch((e) => {
      // Empty answer from every provider: keep the previous "No response" placeholder.
      if (e instanceof AiError && e.reason === 'empty') return '';
      throw e;
    });
    const [resA, resB] = await Promise.allSettled([run(promptA), run(promptB)]);

    const statuses = [resA, resB]
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof AiError ? r.reason.status : 500));

    // Handle rate limiting
    if (statuses.includes(429)) {
      return new Response(
        JSON.stringify({ error: en ? 'Rate limit exceeded. Please try again later.' : 'Limite de pedidos excedido. Tenta novamente mais tarde.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (statuses.includes(402)) {
      return new Response(
        JSON.stringify({ error: en ? 'Insufficient credits.' : 'Créditos insuficientes.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (resA.status === 'rejected' || resB.status === 'rejected') {
      console.error('AI provider error:', ...statuses);
      return new Response(
        JSON.stringify({ error: en ? 'Error processing the prompts' : 'Erro ao processar os prompts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentA = toPlainText(resA.value) || (en ? 'No response' : 'Sem resposta');
    const contentB = toPlainText(resB.value) || (en ? 'No response' : 'Sem resposta');

    console.log('Successfully tested both prompts');

    return new Response(
      JSON.stringify({
        responseA: contentA,
        responseB: contentB
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in test-prompts function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
