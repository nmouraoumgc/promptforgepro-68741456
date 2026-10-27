import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, corsHeaders } from "../_shared/auth.ts";
import { PT_PT_RULES } from '../_shared/ptpt.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const { request: promptRequest, language } = await req.json();
    const request = promptRequest;

    if (!request || request.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Pedido é obrigatório / Request is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use explicit language preference if provided, otherwise auto-detect from input
    const explicitLang = language === 'en' || language === 'pt' ? language : null;
    const isEnglish = explicitLang
      ? explicitLang === 'en'
      : /^[a-zA-Z\s.,!?'"()-]+$/.test(request.trim());
    const outputLanguage = isEnglish ? 'English' : 'Portuguese (Portugal)';

    const systemPrompt = `You are an expert prompt engineer. Your task is to create high-quality, effective prompts for AI models.

Given a user's request, generate a professional, well-structured prompt that:
- Is clear and specific
- Has well-defined sections (context, instructions, expected output)
- Is optimized for getting the best results from AI models
- Is formatted in a readable way

CRITICAL LANGUAGE RULE:
- The ENTIRE generated prompt MUST be written in ${outputLanguage}.
- Do NOT mix languages. Do NOT add translations.
- Generate ONLY the final prompt, without explanations or additional text.
- The prompt should be ready to use immediately.`;

    const userRequest = `Create a prompt based on this request:\n\n"${request}"`;

    console.log('Generating quick prompt with Groq API...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('AI_MODEL') ?? 'openai/gpt-oss-120b',
        ...(Deno.env.get('AI_REASONING_EFFORT') ? { reasoning_effort: Deno.env.get('AI_REASONING_EFFORT') } : {}),
        messages: [
          { role: 'system', content: isEnglish ? systemPrompt : systemPrompt + PT_PT_RULES },
          { role: 'user', content: userRequest }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de pedidos excedido. Tenta novamente mais tarde. / Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. / Insufficient credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar o pedido / Error processing request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedPrompt = data.choices?.[0]?.message?.content;

    if (!generatedPrompt) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Resposta vazia da IA / Empty AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully generated quick prompt');

    return new Response(
      JSON.stringify({ 
        prompt: generatedPrompt.trim(),
        language: isEnglish ? 'en' : 'pt'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in quick-prompt function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido / Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
