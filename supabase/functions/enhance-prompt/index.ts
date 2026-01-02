import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, context } = await req.json();
    
    console.log("Enhancing prompt with context:", JSON.stringify(context).substring(0, 100));

    if (!prompt || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "O prompt é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `És um especialista em engenharia de prompts.
O teu trabalho é melhorar prompts para que sejam mais eficazes com modelos de IA.
Respondes sempre em português de Portugal.
Mantém a estrutura clara e organizada.`;

    const contextInfo = context ? `
CONTEXTO ADICIONAL:
- Objetivo: ${context.objective || 'Não especificado'}
- Tipo de output: ${context.outputType || 'Texto'}
- Tom: ${context.tone || 'Neutro'}
- Público-alvo: ${context.targetAudience || 'Geral'}
- Nível de criatividade: ${context.creativityLevel || 50}%
` : '';

    const userPrompt = `Melhora este prompt tornando-o mais claro, específico e eficaz.
${contextInfo}
PROMPT ORIGINAL:
"""
${prompt}
"""

Regras:
1. Mantém o objetivo original
2. Adiciona clareza e especificidade onde necessário
3. Estrutura o prompt de forma lógica
4. Remove ambiguidades
5. Adiciona exemplos ou formato de output se relevante

Responde APENAS com o prompt melhorado, sem explicações.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos excedido. Tenta novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao melhorar o prompt. Tenta novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const enhancedPrompt = data.choices?.[0]?.message?.content || prompt;

    console.log("Prompt enhanced successfully");

    return new Response(
      JSON.stringify({ enhancedPrompt: enhancedPrompt.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("enhance-prompt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
