import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, corsHeaders } from "../_shared/auth.ts";
import { outputLanguageRules, isEnglishLang } from '../_shared/ptpt.ts';

// Pack-specific prompts for different content types
const getPackPrompt = (packSlug: string, tema: string, isPremium: boolean) => {
  const count = isPremium ? 5 : 2;
  
  const prompts: Record<string, { system: string; user: string }> = {
    tiktok: {
      system: `És um especialista em criação de conteúdo viral para TikTok. 
Geras hooks curtos, impactantes e em português de Portugal.
Os hooks devem parar o scroll nos primeiros 3 segundos.
Usa linguagem simples, direta e curiosa.
Não reveles tudo no início - deixa suspense.`,
      user: `Cria ${count} hooks curtos para um vídeo de TikTok sobre "${tema}", pensados para parar o scroll nos primeiros 3 segundos.

Regras:
- Começa cada hook com uma frase forte ou inesperada
- Usa linguagem simples e direta
- Não reveles tudo no início
- Máximo 15 palavras por hook

Formato:
Responde APENAS com os hooks numerados, um por linha. Sem introdução nem explicação.`,
    },
    instagram: {
      system: `És um especialista em Instagram Reels e crescimento orgânico.
Crias ideias de conteúdo que aumentam alcance, saves e interações.
Escreves em português de Portugal.
Focas em conteúdo que funciona no algoritmo atual.`,
      user: `Cria ${count} ideias de Reels sobre "${tema}" otimizadas para alcance e engagement.

Regras:
- Cada ideia deve ter um hook forte no início
- Foca em conteúdo que gera saves e partilhas
- Inclui o formato sugerido (tutorial, bastidores, storytelling, etc.)
- Máximo 20 palavras por ideia

Formato:
Responde APENAS com as ideias numeradas, uma por linha. Sem introdução nem explicação.`,
    },
    youtube: {
      system: `És um especialista em YouTube e crescimento de canais.
Crias títulos e estruturas que maximizam CTR e watch time.
Escreves em português de Portugal.
Entendes o algoritmo do YouTube e o que retém audiência.`,
      user: `Cria ${count} títulos para vídeos de YouTube sobre "${tema}" otimizados para cliques e retenção.

Regras:
- Usa curiosidade e benefício claro
- Inclui números ou especificidade quando fizer sentido
- Evita clickbait vazio - promete valor real
- Máximo 60 caracteres por título

Formato:
Responde APENAS com os títulos numerados, um por linha. Sem introdução nem explicação.`,
    },
    copywriting: {
      system: `És um copywriter de vendas experiente.
Crias headlines e copy que convertem interesse em ação.
Escreves em português de Portugal.
Usas técnicas como AIDA, PAS, e gatilhos emocionais.`,
      user: `Cria ${count} headlines de vendas para "${tema}" focadas em conversão.

Regras:
- Foca no benefício principal ou na dor do cliente
- Usa linguagem que gera urgência ou curiosidade
- Evita promessas vazias - sê específico
- Máximo 15 palavras por headline

Formato:
Responde APENAS com as headlines numeradas, uma por linha. Sem introdução nem explicação.`,
    },
  };

  // Default prompt for unknown packs
  const defaultPrompt = {
    system: `És um especialista em criação de conteúdo e prompts.
Geras ideias criativas e práticas em português de Portugal.
Focas em resultados tangíveis e aplicáveis.`,
    user: `Cria ${count} ideias de conteúdo sobre "${tema}".

Regras:
- Cada ideia deve ser prática e aplicável
- Usa linguagem simples e direta
- Máximo 20 palavras por ideia

Formato:
Responde APENAS com as ideias numeradas, uma por linha. Sem introdução nem explicação.`,
  };

  return prompts[packSlug] || defaultPrompt;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;
    const isPremium = auth.isPremium;

    const { tema, packSlug, language } = await req.json();
    const en = isEnglishLang(language);

    console.log(`Generating preview for pack: ${packSlug}, tema: ${tema}, isPremium: ${isPremium}`);

    if (!tema || tema.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: en ? "The topic is required" : "O tema é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!packSlug) {
      return new Response(
        JSON.stringify({ error: en ? "The pack is required" : "O pack é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not configured");
      throw new Error("GROQ_API_KEY is not configured");
    }

    const { system: baseSystem, user } = getPackPrompt(packSlug, tema.trim(), isPremium);
    // In English mode drop the "write in pt-PT" lines so they don't conflict with the English output rule.
    const system = en
      ? baseSystem
          .replace(/\n?Escreves em português de Portugal\./g, '')
          .replace(/,? e em português de Portugal\./g, '.')
          .replace(/ em português de Portugal\./g, '.')
      : baseSystem;

    console.log("Calling Groq API...");

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
          { role: "system", content: system + outputLanguageRules(language) },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: en ? "Rate limit exceeded. Please try again in a few seconds." : "Limite de pedidos excedido. Tenta novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: en ? "Insufficient credits." : "Créditos insuficientes. Adiciona créditos à tua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: en ? "Error generating content. Please try again." : "Erro ao gerar conteúdo. Tenta novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("AI response received:", content.substring(0, 100));

    // Parse the numbered list into an array
    const lines = content
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .map((line: string) => {
        // Remove numbering (e.g., "1.", "1)", "1-", etc.)
        return line.replace(/^\d+[\.\)\-\:]\s*/, '').trim();
      })
      .filter((line: string) => line.length > 0);

    const totalCount = isPremium ? 5 : 2;
    const results = lines.slice(0, totalCount);

    console.log(`Returning ${results.length} results`);

    return new Response(
      JSON.stringify({ 
        results,
        limited: !isPremium,
        totalGenerated: results.length,
        maxAvailable: 5
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-pack-preview error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
