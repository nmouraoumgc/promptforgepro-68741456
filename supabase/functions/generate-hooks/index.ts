import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, corsHeaders } from "../_shared/auth.ts";
import { outputLanguageRules, isEnglishLang } from '../_shared/ptpt.ts';
import { plainTextRules, toPlainText } from '../_shared/plaintext.ts';
import { chat, AiError, hasAiProvider } from '../_shared/ai.ts';

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

    if (!hasAiProvider()) {
      throw new Error("API key não configurada");
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

    let content = "";
    try {
      const r = await chat([
        { role: "system", content: systemPrompt + outputLanguageRules(language) + plainTextRules(language) },
        { role: "user", content: userPrompt },
      ], {
        maxTokens: 1500, // was 500; raised because reasoning models (gpt-oss) count reasoning tokens here
        temperature: 0.8,
      });
      content = r.content;
    } catch (e) {
      const status = e instanceof AiError ? e.status : 500;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos excedido. Tenta novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adiciona créditos à tua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Empty answer from every provider: keep the previous behaviour (200 with empty hooks).
      if (!(e instanceof AiError && e.reason === "empty")) {
        console.error("AI provider error:", status);
        return new Response(
          JSON.stringify({ error: "Erro ao gerar hooks. Tenta novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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
