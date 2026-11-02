import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, corsHeaders } from "../_shared/auth.ts";
import { PT_PT_RULES } from '../_shared/ptpt.ts';
import { plainTextRules, toPlainText } from '../_shared/plaintext.ts';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;
    const isPremium = auth.isPremium;

    const { tema } = await req.json();

    if (!tema || tema.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "O tema é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    // Hook de choque controlado prompt
    const hookCount = isPremium ? 5 : 2;
    const systemPrompt = `És um especialista em criação de conteúdo viral para TikTok. 
Geras hooks curtos, impactantes e em português de Portugal.
Os hooks devem parar o scroll nos primeiros 3 segundos.
Usa linguagem simples, direta e curiosa.
Não reveles tudo no início - deixa suspense.`;

    const userPrompt = `Cria ${hookCount} hooks curtos para um vídeo de TikTok sobre "${tema}", pensados para parar o scroll nos primeiros 3 segundos.

Regras:
- Começa cada hook com uma frase forte ou inesperada
- Usa linguagem simples e direta
- Não reveles tudo no início
- Máximo 15 palavras por hook

Formato:
Responde APENAS com os hooks numerados, um por linha. Sem introdução nem explicação.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get('AI_MODEL') ?? 'openai/gpt-oss-120b',
        ...(Deno.env.get('AI_REASONING_EFFORT') ? { reasoning_effort: Deno.env.get('AI_REASONING_EFFORT') } : {}),
        messages: [
          { role: "system", content: systemPrompt + PT_PT_RULES + plainTextRules('pt') },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1500, // was 500; raised because reasoning models (gpt-oss) count reasoning tokens here
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos excedido. Tenta novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adiciona créditos à tua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar hooks. Tenta novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ 
        hooks: toPlainText(content),
        limited: !isPremium,
        totalHooks: isPremium ? 5 : 2,
        maxHooks: 5
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-hooks error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
