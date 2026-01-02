import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const variationPrompts = {
  shorter: {
    instruction: "Cria uma versão mais curta e condensada deste prompt, mantendo apenas o essencial.",
    changes: ["Contexto redundante removido", "Instruções simplificadas", "Foco no essencial"]
  },
  detailed: {
    instruction: "Expande este prompt com mais contexto, exemplos e especificações detalhadas.",
    changes: ["Contexto expandido", "Exemplos adicionados", "Instruções detalhadas"]
  },
  creative: {
    instruction: "Reformula este prompt para incentivar respostas mais criativas e originais, dando mais liberdade à IA.",
    changes: ["Criatividade incentivada", "Menos restrições", "Abordagens originais"]
  },
  technical: {
    instruction: "Torna este prompt mais técnico e preciso, com linguagem formal e especificações claras.",
    changes: ["Terminologia técnica", "Estrutura formal", "Especificações precisas"]
  },
  restrictive: {
    instruction: "Adiciona mais restrições e limites a este prompt para controlar melhor o output.",
    changes: ["Formato estrito definido", "Limites claros", "Restrições explícitas"]
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
    console.log("Optimizing prompt:", prompt.substring(0, 100));

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
Analisas e otimizas prompts para obter melhores resultados de modelos de IA.
Respondes sempre em português de Portugal.
Sê direto e prático nas tuas sugestões.`;

    // Generate all variations in parallel
    const variationTypes = Object.keys(variationPrompts) as (keyof typeof variationPrompts)[];
    
    const variationPromises = variationTypes.map(async (type) => {
      const { instruction, changes } = variationPrompts[type];
      
      const userPrompt = `${instruction}

PROMPT ORIGINAL:
"""
${prompt}
"""

Responde APENAS com o prompt otimizado, sem explicações ou introduções.`;

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
        console.error(`Error generating ${type} variation:`, response.status);
        return { type, content: prompt, changes, error: true };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || prompt;

      return { type, content: content.trim(), changes };
    });

    // Generate score analysis
    const scorePromise = fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Analisa este prompt e dá uma pontuação de 0 a 100 para cada critério.

PROMPT:
"""
${prompt}
"""

Responde APENAS em JSON válido com este formato exato:
{"clarity": 75, "specificity": 60, "structure": 80, "creativity": 50, "overall": 66, "improvements": ["sugestão 1", "sugestão 2", "sugestão 3"]}` 
          },
        ],
      }),
    }).then(async (response) => {
      if (!response.ok) {
        return { clarity: 70, specificity: 65, structure: 75, creativity: 60, overall: 68, improvements: [] };
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      try {
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Error parsing score JSON:", e);
      }
      return { clarity: 70, specificity: 65, structure: 75, creativity: 60, overall: 68, improvements: [] };
    });

    const [variations, score] = await Promise.all([
      Promise.all(variationPromises),
      scorePromise
    ]);

    console.log("Generated", variations.length, "variations");

    return new Response(
      JSON.stringify({ variations, score }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("optimize-prompt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
