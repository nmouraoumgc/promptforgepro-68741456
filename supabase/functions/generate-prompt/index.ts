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

    const { 
      objective, 
      outputType, 
      targetModel, 
      tone, 
      targetAudience, 
      constraints, 
      creativityLevel,
      format,
      language: reqLanguage,
      useBrand, brandId,
    } = await req.json();
    const brand = await resolveTaskBrand(auth.userId, { useBrand, brandId });
    const language = reqLanguage ?? brand?.language;

    if (!objective) {
      return new Response(
        JSON.stringify({ error: 'Objetivo é obrigatório' }),
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

    const toneLabels: Record<string, string> = {
      professional: 'Profissional',
      casual: 'Casual',
      formal: 'Formal',
      friendly: 'Amigável',
      technical: 'Técnico',
      creative: 'Criativo',
      persuasive: 'Persuasivo',
      informative: 'Informativo',
    };

    const outputTypeLabels: Record<string, string> = {
      text: 'texto',
      image: 'imagem',
      code: 'código',
      video: 'vídeo',
      audio: 'áudio',
    };

    const isEnglish = language === 'en';
    const outputLanguage = isEnglish ? 'English' : 'Portuguese (Portugal)';

    const systemPrompt = isEnglish
      ? `You are an expert prompt engineer. Your task is to create high-quality prompts based on the user's specifications.

Create a professional, optimized prompt that:
- Is clear and specific
- Has a well-defined structure with sections (section titles as plain lines in CAPITALS)
- Includes context, instructions and output expectations
- Is plain text that can be copy-pasted anywhere (no Markdown)
- Is optimized for ${targetModel || 'any AI model'}

The prompt MUST be entirely written in English and ready to use.`
      : `És um especialista em engenharia de prompts. A tua tarefa é criar prompts de alta qualidade baseados nas especificações do utilizador.

Cria um prompt profissional e otimizado que:
- Seja claro e específico
- Tenha estrutura bem definida com secções (títulos das secções em linhas simples em MAIÚSCULAS)
- Inclua contexto, instruções e expectativas de output
- Seja texto simples, pronto a copiar e colar em qualquer lado (sem Markdown)
- Esteja otimizado para ${targetModel || 'qualquer modelo de IA'}

O prompt DEVE estar totalmente em português (Portugal) e ser pronto a usar.`;

    const labels = isEnglish
      ? {
          intro: 'Create a prompt with these characteristics:',
          objective: 'OBJECTIVE',
          outputType: 'OUTPUT TYPE',
          tone: 'TONE',
          audience: 'TARGET AUDIENCE',
          creativity: 'CREATIVITY LEVEL',
          format: 'FORMAT',
          constraints: 'CONSTRAINTS',
          creativityHigh: 'very creative',
          creativityLow: 'conservative',
          creativityMid: 'balanced',
          outro: '\n\nReturn ONLY the final prompt, without additional explanations.',
        }
      : {
          intro: 'Cria um prompt com estas características:',
          objective: 'OBJETIVO',
          outputType: 'TIPO DE OUTPUT',
          tone: 'TOM',
          audience: 'PÚBLICO-ALVO',
          creativity: 'NÍVEL DE CRIATIVIDADE',
          format: 'FORMATO',
          constraints: 'RESTRIÇÕES',
          creativityHigh: 'muito criativo',
          creativityLow: 'conservador',
          creativityMid: 'equilibrado',
          outro: '\n\nGera APENAS o prompt final, sem explicações adicionais.',
        };

    let userRequest = `${labels.intro}

${labels.objective}: ${objective}
${labels.outputType}: ${isEnglish ? (outputType || 'text') : (outputTypeLabels[outputType] || 'texto')}`;

    if (tone) {
      userRequest += `\n${labels.tone}: ${isEnglish ? tone : (toneLabels[tone] || tone)}`;
    }
    if (targetAudience) {
      userRequest += `\n${labels.audience}: ${targetAudience}`;
    }
    if (creativityLevel !== undefined) {
      const level = creativityLevel > 70 ? labels.creativityHigh : creativityLevel < 30 ? labels.creativityLow : labels.creativityMid;
      userRequest += `\n${labels.creativity}: ${creativityLevel}% (${level})`;
    }
    if (format) {
      userRequest += `\n${labels.format}: ${format}`;
    }
    if (constraints && constraints.length > 0) {
      userRequest += `\n${labels.constraints}:\n${constraints.map((c: string) => `- ${c}`).join('\n')}`;
    }

    userRequest += labels.outro;

    console.log('Generating prompt...');

    let generatedPrompt: string;
    try {
      const r = await chat([
        { role: 'system', content: (systemPrompt + outputLanguageRules(language)) + brandInstructions(brand, isEnglish) + plainTextRules(isEnglish ? 'en' : 'pt') },
        { role: 'user', content: userRequest },
      ]);
      generatedPrompt = r.content;
    } catch (e) {
      const status = e instanceof AiError ? e.status : 500;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de pedidos excedido. Tenta novamente mais tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (e instanceof AiError && e.reason === 'empty') {
        console.error('No content in AI response');
        return new Response(
          JSON.stringify({ error: 'Resposta vazia da IA' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('AI provider error:', status);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar o pedido' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully generated prompt');

    return new Response(
      JSON.stringify({ prompt: toPlainText(generatedPrompt), brand: brand ? { id: brand.id, name: brand.name } : null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    if (error instanceof BrandSelectionError) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    console.error('Error in generate-prompt function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
