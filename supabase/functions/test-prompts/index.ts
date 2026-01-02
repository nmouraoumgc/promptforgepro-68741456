import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { promptA, promptB } = await req.json();
    
    console.log("Testing prompts A/B");

    if (!promptA || !promptB) {
      return new Response(
        JSON.stringify({ error: "Ambos os prompts são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Execute both prompts in parallel
    const executePrompt = async (prompt: string, label: string) => {
      console.log(`Executing prompt ${label}...`);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error executing prompt ${label}:`, response.status, errorText);
        
        if (response.status === 429) {
          throw new Error("Limite de pedidos excedido. Tenta novamente em alguns segundos.");
        }
        if (response.status === 402) {
          throw new Error("Créditos insuficientes.");
        }
        
        throw new Error(`Erro ao executar prompt ${label}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "Sem resposta";
    };

    const [responseA, responseB] = await Promise.all([
      executePrompt(promptA, "A"),
      executePrompt(promptB, "B")
    ]);

    console.log("Both prompts executed successfully");

    return new Response(
      JSON.stringify({ responseA, responseB }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("test-prompts error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
