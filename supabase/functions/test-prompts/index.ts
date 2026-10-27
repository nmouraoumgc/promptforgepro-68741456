import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, corsHeaders } from "../_shared/auth.ts";
import { outputLanguageRules, isEnglishLang } from '../_shared/ptpt.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const { promptA, promptB, language } = await req.json();
    const en = isEnglishLang(language);
    const systemPrompt = (en
      ? 'You are a helpful assistant. Answer clearly and concisely in English.'
      : 'És um assistente prestável. Responde de forma clara e concisa em português de Portugal.') + outputLanguageRules(language);

    if (!promptA || !promptB) {
      return new Response(
        JSON.stringify({ error: en ? 'Both prompts are required' : 'Ambos os prompts são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: en ? 'API key not configured' : 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Testing prompts A and B...');

    // Test both prompts in parallel
    const [responseA, responseB] = await Promise.all([
      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: Deno.env.get('AI_MODEL') ?? 'openai/gpt-oss-120b',
          ...(Deno.env.get('AI_REASONING_EFFORT') ? { reasoning_effort: Deno.env.get('AI_REASONING_EFFORT') } : {}),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: promptA }
          ],
        }),
      }),
      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: Deno.env.get('AI_MODEL') ?? 'openai/gpt-oss-120b',
          ...(Deno.env.get('AI_REASONING_EFFORT') ? { reasoning_effort: Deno.env.get('AI_REASONING_EFFORT') } : {}),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: promptB }
          ],
        }),
      })
    ]);

    // Handle rate limiting
    if (responseA.status === 429 || responseB.status === 429) {
      return new Response(
        JSON.stringify({ error: en ? 'Rate limit exceeded. Please try again later.' : 'Limite de pedidos excedido. Tenta novamente mais tarde.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (responseA.status === 402 || responseB.status === 402) {
      return new Response(
        JSON.stringify({ error: en ? 'Insufficient credits.' : 'Créditos insuficientes.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!responseA.ok || !responseB.ok) {
      console.error('AI gateway error:', responseA.status, responseB.status);
      return new Response(
        JSON.stringify({ error: en ? 'Error processing the prompts' : 'Erro ao processar os prompts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [dataA, dataB] = await Promise.all([
      responseA.json(),
      responseB.json()
    ]);

    const contentA = dataA.choices?.[0]?.message?.content || (en ? 'No response' : 'Sem resposta');
    const contentB = dataB.choices?.[0]?.message?.content || (en ? 'No response' : 'Sem resposta');

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
