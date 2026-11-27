import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withOptimizationQuota } from "../_shared/optimizationQuota.ts";
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

    const { prompt, language: reqLanguage, useBrand, brandId } = await req.json();
    const brand = await resolveTaskBrand(auth.userId, { useBrand, brandId });
    const language = reqLanguage ?? brand?.language;

    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 20000) {
      return new Response(
        JSON.stringify({ error: 'Prompt é obrigatório' }),
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

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    return await withOptimizationQuota({ userId: auth.userId, prompt, isPremium: auth.isPremium, rpc: (name, args) => admin.rpc(name, args), headers: { ...corsHeaders, 'Content-Type': 'application/json' } }, async () => {
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

    console.log('Calling AI for prompt optimization...');

    let content: string;
    try {
      const r = await chat([
        { role: 'system', content: (systemPrompt + outputLanguageRules(language)) + brandInstructions(brand, isEnglish) + (isEnglish
          ? '\n\nThe "content" of each variation is a plain-text prompt (use \\n for line breaks inside the JSON string).'
          : '\n\nO "content" de cada variação é um prompt em texto simples (usa \\n para quebras de linha dentro da string JSON).') + plainTextRules(isEnglish ? 'en' : 'pt') },
        { role: 'user', content: isEnglish ? `Analyze and optimize this prompt:\n\n"${prompt}"` : `Analisa e otimiza este prompt:\n\n"${prompt}"` },
      ], { timeoutMs: 45_000 });
      content = r.content;
    } catch (e) {
      const status = e instanceof AiError ? e.status : 500;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'O fornecedor de IA limitou temporariamente os pedidos. Tenta novamente mais tarde. / The AI provider temporarily rate-limited requests. Please try again later.', code: 'AI_RATE_LIMIT' }),
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
      if (e instanceof AiError && e.reason === 'timeout') {
        // Same outcome as the previous AbortSignal.timeout(45000) path (generic optimize error).
        console.error('AI provider timeout');
        return new Response(
          JSON.stringify({ error: 'Não foi possível otimizar. Tenta novamente. / Could not optimize. Try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('AI gateway error:', status);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar o pedido' }),
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

    // Strip any Markdown the model still produced in textual fields.
    if (Array.isArray(result.optimizations)) {
      result.optimizations = result.optimizations.map((o: Record<string, unknown>) => ({
        ...o,
        content: toPlainText(o?.content),
        explanation: toPlainText(o?.explanation),
        changes: Array.isArray(o?.changes) ? (o.changes as unknown[]).map(toPlainText) : o?.changes,
      }));
    }
    if (Array.isArray(result.improvements)) result.improvements = result.improvements.map(toPlainText);

    console.log('Successfully optimized prompt');

    return new Response(
      JSON.stringify({ ...result, score: normalizedScore, brand: brand ? { id: brand.id, name: brand.name } : null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    });
  } catch (error) {
    if (error instanceof BrandSelectionError) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    console.error('Error in optimize-prompt function');
    return new Response(
      JSON.stringify({ error: 'Não foi possível otimizar. Tenta novamente. / Could not optimize. Try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
