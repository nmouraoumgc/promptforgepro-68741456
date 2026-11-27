import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, corsHeaders } from "../_shared/auth.ts";
import { resolveTaskBrand, BrandSelectionError, brandInstructions } from "../_shared/brand.ts";
import { outputLanguageRules } from '../_shared/ptpt.ts';
import { plainTextRules, toPlainText } from '../_shared/plaintext.ts';
import { chat, AiError, hasAiProvider } from '../_shared/ai.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const { request: promptRequest, language: reqLanguage, useBrand, brandId } = await req.json();
    const brand = await resolveTaskBrand(auth.userId, { useBrand, brandId });
    const language = reqLanguage ?? brand?.language;
    const request = promptRequest;

    if (!request || request.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Pedido é obrigatório / Request is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!hasAiProvider()) {
      console.error('AI provider not configured');
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
- Has well-defined sections (context, instructions, expected output), with section titles as plain lines in CAPITALS
- Is optimized for getting the best results from AI models
- Is plain text that can be copy-pasted anywhere (no Markdown)

CRITICAL LANGUAGE RULE:
- The ENTIRE generated prompt MUST be written in ${outputLanguage}.
- Do NOT mix languages. Do NOT add translations.
- Generate ONLY the final prompt, without explanations or additional text.
- The prompt should be ready to use immediately.`;

    const userRequest = `Create a prompt based on this request:\n\n"${request}"`;

    console.log('Generating quick prompt...');

    let generatedPrompt: string;
    try {
      const r = await chat([
        { role: 'system', content: (systemPrompt + outputLanguageRules(isEnglish ? 'en' : 'pt')) + brandInstructions(brand, isEnglish) + plainTextRules(isEnglish ? 'en' : 'pt') },
        { role: 'user', content: userRequest },
      ]);
      generatedPrompt = r.content;
    } catch (e) {
      const status = e instanceof AiError ? e.status : 500;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de pedidos excedido. Tenta novamente mais tarde. / Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. / Insufficient credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (e instanceof AiError && e.reason === 'empty') {
        console.error('No content in AI response');
        return new Response(
          JSON.stringify({ error: 'Resposta vazia da IA / Empty AI response' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('AI provider error:', status);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar o pedido / Error processing request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully generated quick prompt');

    return new Response(
      JSON.stringify({ 
        prompt: toPlainText(generatedPrompt),
        brand: brand ? { id: brand.id, name: brand.name } : null,
        language: isEnglish ? 'en' : 'pt'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    if (error instanceof BrandSelectionError) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    console.error('Error in quick-prompt function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido / Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
