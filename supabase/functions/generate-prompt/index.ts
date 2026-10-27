import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, corsHeaders } from "../_shared/auth.ts";

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
      language 
    } = await req.json();

    if (!objective) {
      return new Response(
        JSON.stringify({ error: 'Objetivo é obrigatório' }),
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
- Has a well-defined structure with sections
- Includes context, instructions and output expectations
- Is formatted in a readable way
- Is optimized for ${targetModel || 'any AI model'}

The prompt MUST be entirely written in English and ready to use.`
      : `És um especialista em engenharia de prompts. A tua tarefa é criar prompts de alta qualidade baseados nas especificações do utilizador.

Cria um prompt profissional e otimizado que:
- Seja claro e específico
- Tenha estrutura bem definida com secções
- Inclua contexto, instruções e expectativas de output
- Seja formatado de forma legível
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
${labels.outputType}: ${outputTypeLabels[outputType] || (isEnglish ? 'text' : 'texto')}`;

    if (tone) {
      userRequest += `\n${labels.tone}: ${toneLabels[tone] || tone}`;
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

    console.log('Generating prompt with Groq API...');

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userRequest }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de pedidos excedido. Tenta novamente mais tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar o pedido' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedPrompt = data.choices?.[0]?.message?.content;

    if (!generatedPrompt) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Resposta vazia da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully generated prompt');

    return new Response(
      JSON.stringify({ prompt: generatedPrompt.trim() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-prompt function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
