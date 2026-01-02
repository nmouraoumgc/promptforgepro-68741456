import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Prompt é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `És um especialista em engenharia de prompts. A tua tarefa é analisar e otimizar prompts para IA.

Dado um prompt original, deves:
1. Avaliar a qualidade do prompt nas seguintes dimensões (0-100):
   - clarity: clareza do objetivo
   - specificity: nível de detalhe e especificidade  
   - structure: organização e estrutura
   - creativity: potencial criativo
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

IMPORTANTE: Responde APENAS com JSON válido, sem markdown ou explicações adicionais.

Formato da resposta:
{
  "score": { "clarity": 75, "specificity": 60, "structure": 80, "creativity": 65, "overall": 70 },
  "optimizations": [
    { "type": "shorter", "content": "...", "explanation": "...", "changes": ["...", "..."] },
    { "type": "detailed", "content": "...", "explanation": "...", "changes": ["...", "..."] },
    { "type": "creative", "content": "...", "explanation": "...", "changes": ["...", "..."] },
    { "type": "technical", "content": "...", "explanation": "...", "changes": ["...", "..."] },
    { "type": "restrictive", "content": "...", "explanation": "...", "changes": ["...", "..."] }
  ],
  "improvements": ["...", "...", "..."]
}`;

    console.log('Calling Lovable AI for prompt optimization...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analisa e otimiza este prompt:\n\n"${prompt}"` }
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

    console.log('Successfully optimized prompt');

    return new Response(
      JSON.stringify(result),
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
