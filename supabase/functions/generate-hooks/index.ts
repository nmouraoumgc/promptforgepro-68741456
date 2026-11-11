import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, corsHeaders } from "../_shared/auth.ts";
import { outputLanguageRules, isEnglishLang } from '../_shared/ptpt.ts';
import { plainTextRules, toPlainText } from '../_shared/plaintext.ts';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;
    const isPremium = auth.isPremium;

    const { tema, language: reqLanguage } = await req.json();
    const language = typeof reqLanguage === 'string' && isEnglishLang(reqLanguage) ? 'en' : 'pt';
    const en = language === 'en';

    if (!tema || tema.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: en ? "The topic is required" : "O tema é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    // Hook de choque controlado prompt
    const hookCount = isPremium ? 5 : 2;
    const systemPrompt = en
      ? `The assistant is a specialist in viral TikTok content. Generate concise, impactful hooks in English.
The hooks should capture attention within the first three seconds.
Use direct, clear and intriguing language without revealing everything at the beginning.`
      : `O assistente é especialista em conteúdo viral para TikTok.
Os hooks devem ser curtos, impactantes e escritos em português de Portugal.
Devem captar a atenção nos primeiros três segundos, com linguagem clara e intrigante.
Não revelar tudo no início, mantendo o suspense.`;

    const userPrompt = en
      ? `Create ${hookCount} short TikTok hooks about "${tema}".
Rules:
- Start each hook with a strong or unexpected line
- Use clear, direct language
- Keep some suspense
- Maximum 15 words per hook
Format: Return ONLY numbered hooks, one per line. No introduction or explanation.`
      : `Criar ${hookCount} hooks curtos para um vídeo de TikTok sobre "${tema}".
Regras:
- Cada hook deve começar com uma frase forte ou inesperada
- Usar linguagem simples e direta
- Manter algum suspense
- Máximo de 15 palavras por hook
Formato: Apresentar APENAS os hooks numerados, um por linha. Sem introdução nem explicação.`;

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
          { role: "system", content: systemPrompt + outputLanguageRules(language) + plainTextRules(language) },
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
