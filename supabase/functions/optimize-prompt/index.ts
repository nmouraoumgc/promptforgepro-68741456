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

    const { prompt, language } = await req.json();

    if (!prompt || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Prompt é obrigatório' }),
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

    const isEnglish = language === 'en';
    const systemPrompt = isEnglish
      ? `You are an expert prompt engineer. Your task is to analyze and optimize AI prompts.

Given an original prompt, you must:
1. Score its quality on these dimensions (0-100):
   - clarity
   - context
   - aiRole
   - constraints
   - outputFormat
   - successCriteria
   - genericResponseRisk (higher = more likely to generate generic responses)
   - overall

2. Generate 5 optimized variations:
   - shorter: shorter and more direct
   - detailed: more detailed with extra context
   - creative: encourages more creativity
   - technical: more technical and precise
   - restrictive: more controlled and constrained

For each variation include:
- content: the full optimized prompt
- explanation: brief explanation of improvements (1 sentence)
- changes: list of 2-3 specific changes made

3. List 3-5 general improvements identified.

CRITICAL: All textual fields (content, explanation, changes, improvements) MUST be written in English.
IMPORTANT: Respond ONLY with valid JSON, no markdown or extra text.

Format:
{
  "score": {
    "clarity": 75,
    "context": 60,
    "aiRole": 80,
    "constraints": 65,
    "outputFormat": 70,
    "successCriteria": 55,
    "genericResponseRisk": 45,
    "overall": 68
  },
  "optimizations": [
    { "type": "shorter", "content": "...", "explanation": "...", "changes": ["...", "..."] },
    { "type": "detailed", "content": "...", "explanation": "...", "changes": ["...", "..."] },
    { "type": "creative", "content": "...", "explanation": "...", "changes": ["...", "..."] },
    { "type": "technical", "content": "...", "explanation": "...", "changes": ["...", "..."] },
    { "type": "restrictive", "content": "...", "explanation": "...", "changes": ["...", "..."] }
  ],
  "improvements": ["...", "...", "..."]
}`
      : `És um especialista em engenharia de prompts. A tua tarefa é analisar e otimizar prompts para IA.

Dado um prompt original, deves:
1. Avaliar a qualidade do prompt nas seguintes dimensões (0-100):
   - clarity: clareza do objetivo
   - context: qualidade do contexto fornecido
   - aiRole: clareza do papel atribuído à IA
   - constraints: definição de limites/restrições
   - outputFormat: definição do formato de output esperado
   - successCriteria: critérios para avaliar sucesso/qualidade
   - genericResponseRisk: risco de resposta genérica (quanto maior, pior)
   - overall: pontuação geral

2. Gerar 5 variações otimizadas:
   - shorter: versão mais curta e directa
   - detailed: versão mais detalhada com contexto adicional
   - creative: versão que encoraja mais criatividade
   - technical: versão mais técnica e precisa
   - restrictive: versão com mais controlo e restrições

Para cada variação, inclui:
- content: o prompt otimizado completo
- explanation: breve explicação das melhorias (1 frase)
- changes: lista de 2-3 mudanças específicas feitas

3. Lista de 3-5 melhorias gerais identificadas no prompt original.

CRÍTICO: Todos os campos textuais (content, explanation, changes, improvements) DEVEM estar em português (Portugal).
IMPORTANTE: Responde APENAS com JSON válido, sem markdown ou explicações adicionais.

Formato da resposta:
{
  "score": {
    "clarity": 75,
    "context": 60,
    "aiRole": 80,
    "constraints": 65,
    "outputFormat": 70,
    "successCriteria": 55,
    "genericResponseRisk": 45,
    "overall": 68
  },
  "optimizations": [
    { "type": "shorter", "content": "...", "explanation": "...", "changes": ["...", "..."] },
    { "type": "detailed", "content": "...", "explanation": "...", "changes": ["...", "..."] },
    { "type": "creative", "content": "...", "explanation": "...", "changes": ["...", "..."] },
    { "type": "technical", "content": "...", "explanation": "...", "changes": ["...", "..."] },
    { "type": "restrictive", "content": "...", "explanation": "...", "changes": ["...", "..."] }
  ],
  "improvements": ["...", "...", "..."]
}`;

    console.log('Calling Groq API for prompt optimization...');

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
          { role: 'user', content: isEnglish ? `Analyze and optimize this prompt:\n\n"${prompt}"` : `Analisa e otimiza este prompt:\n\n"${prompt}"` }
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
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Resposta vazia da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON response, handling potential markdown code blocks
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }

    const result = JSON.parse(jsonContent.trim());
    const rawScore = result?.score ?? {};
    const normalizedScore = {
      clarity: Number(rawScore.clarity ?? 0),
      context: Number(rawScore.context ?? rawScore.specificity ?? 0),
      aiRole: Number(rawScore.aiRole ?? 0),
      constraints: Number(rawScore.constraints ?? 0),
      outputFormat: Number(rawScore.outputFormat ?? rawScore.structure ?? 0),
      successCriteria: Number(rawScore.successCriteria ?? 0),
      genericResponseRisk: Number(rawScore.genericResponseRisk ?? (100 - Number(rawScore.creativity ?? 50))),
      overall: Number(rawScore.overall ?? 0),
    };

    console.log('Successfully optimized prompt');

    return new Response(
      JSON.stringify({ ...result, score: normalizedScore }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in optimize-prompt function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
