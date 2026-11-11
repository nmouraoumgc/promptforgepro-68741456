import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, corsHeaders } from "../_shared/auth.ts";
import { resolveTaskBrand, brandInstructions } from "../_shared/brand.ts";
import { outputLanguageRules, isEnglishLang } from '../_shared/ptpt.ts';
import { plainTextRules, toPlainText } from '../_shared/plaintext.ts';

// Pack-specific preview generators, one per pack slug (all 14 packs), in pt-PT and EN.
// Each returns short, ready-to-use items (one per line) so free users see real value.
type PreviewDef = { role: string; item: string; rules: string[] };
const PREVIEWS: Record<string, { pt: PreviewDef; en: PreviewDef }> = {
  tiktok: {
    pt: { role: 'especialista em conteúdo viral para TikTok', item: 'hooks curtos para um vídeo de TikTok sobre', rules: ['Pensados para parar o scroll nos primeiros 3 segundos', 'Começa com uma frase forte ou inesperada', 'Não reveles tudo no início', 'Máximo 15 palavras por hook'] },
    en: { role: 'viral TikTok content expert', item: 'short hooks for a TikTok video about', rules: ['Built to stop the scroll in the first 3 seconds', 'Open with a strong or unexpected line', 'Do not give everything away at the start', 'Maximum 15 words per hook'] },
  },
  instagram: {
    pt: { role: 'especialista em Instagram Reels e carrosséis', item: 'ideias de Reels ou carrosséis sobre', rules: ['Cada ideia começa com um hook forte', 'Indica o formato (Reel, carrossel ou Stories)', 'Foca em conteúdo que gera guardados e partilhas', 'Máximo 25 palavras por ideia'] },
    en: { role: 'Instagram Reels and carousel expert', item: 'Reel or carousel ideas about', rules: ['Each idea opens with a strong hook', 'State the format (Reel, carousel or Stories)', 'Focus on content that earns saves and shares', 'Maximum 25 words per idea'] },
  },
  youtube: {
    pt: { role: 'especialista em crescimento de canais de YouTube', item: 'títulos de vídeos de YouTube sobre', rules: ['Curiosidade com um benefício claro', 'Usa números ou especificidade quando fizer sentido', 'Sem clickbait vazio', 'Máximo 60 caracteres por título'] },
    en: { role: 'YouTube channel growth expert', item: 'YouTube video titles about', rules: ['Curiosity with a clear benefit', 'Use numbers or specifics where it helps', 'No empty clickbait', 'Maximum 60 characters per title'] },
  },
  copywriting: {
    pt: { role: 'copywriter de vendas experiente', item: 'títulos de vendas para', rules: ['Foca no benefício principal ou na dor do cliente', 'Sê específico, sem promessas vazias', 'Máximo 15 palavras por título'] },
    en: { role: 'experienced sales copywriter', item: 'sales headlines for', rules: ['Focus on the main benefit or the customer pain', 'Be specific, no empty promises', 'Maximum 15 words per headline'] },
  },
  'real-estate': {
    pt: { role: 'consultor imobiliário experiente em Portugal', item: 'títulos de anúncio imobiliário para', rules: ['Pensados para portais imobiliários e redes sociais', 'Destaca um diferencial real do imóvel ou da zona', 'Não inventes características', 'Máximo 70 caracteres por título'] },
    en: { role: 'experienced real estate agent', item: 'property listing headlines for', rules: ['Written for property portals and social media', 'Highlight one real advantage of the property or area', 'Do not invent features', 'Maximum 70 characters per headline'] },
  },
  ecommerce: {
    pt: { role: 'especialista em conversão de lojas online', item: 'frases de abertura para a ficha de produto de', rules: ['Cada frase comunica o benefício principal para o cliente', 'Linguagem concreta, sem exageros', 'Máximo 20 palavras por frase'] },
    en: { role: 'online store conversion expert', item: 'opening lines for the product page of', rules: ['Each line communicates the main customer benefit', 'Concrete language, no hype', 'Maximum 20 words per line'] },
  },
  hr: {
    pt: { role: 'recrutador experiente', item: 'perguntas de entrevista por competências para a função de', rules: ['Cada pergunta pede um exemplo real e concreto', 'Mistura competência técnica, colaboração e resolução de problemas', 'Máximo 25 palavras por pergunta'] },
    en: { role: 'experienced recruiter', item: 'competency-based interview questions for the role of', rules: ['Each question asks for a real, concrete example', 'Mix technical skill, collaboration and problem solving', 'Maximum 25 words per question'] },
  },
  legal: {
    pt: { role: 'assistente de um escritório de advogados', item: 'perguntas essenciais a fazer ao cliente na primeira consulta sobre', rules: ['Foca em factos, datas, documentos e objetivos do cliente', 'Não dês aconselhamento jurídico nem cites legislação', 'Máximo 20 palavras por pergunta'] },
    en: { role: 'law firm assistant', item: 'essential questions to ask the client at the first consultation about', rules: ['Focus on facts, dates, documents and the client\'s goals', 'Do not give legal advice or cite legislation', 'Maximum 20 words per question'] },
  },
  linkedin: {
    pt: { role: 'especialista em LinkedIn e marca pessoal B2B', item: 'primeiras linhas (hooks) para publicações de LinkedIn sobre', rules: ['Cada linha faz o leitor querer clicar em "ver mais"', 'Tom profissional e humano, sem clichés', 'Máximo 20 palavras por linha'] },
    en: { role: 'LinkedIn and B2B personal brand expert', item: 'opening lines (hooks) for LinkedIn posts about', rules: ['Each line makes the reader want to click "see more"', 'Professional, human tone, no clichés', 'Maximum 20 words per line'] },
  },
  hospitality: {
    pt: { role: 'especialista em restauração e alojamento local', item: 'títulos de anúncio ou de publicação para', rules: ['Pensados para Airbnb, Booking, Google ou Instagram', 'Destaca a experiência do cliente ou hóspede', 'Máximo 50 caracteres por título'] },
    en: { role: 'restaurant and holiday rental marketing expert', item: 'listing or post titles for', rules: ['Written for Airbnb, Booking, Google or Instagram', 'Highlight the guest or diner experience', 'Maximum 50 characters per title'] },
  },
  'email-marketing': {
    pt: { role: 'especialista em email marketing', item: 'linhas de assunto de email sobre', rules: ['Mistura curiosidade, benefício e pergunta', 'Sem urgência falsa nem maiúsculas a gritar', 'Máximo 45 caracteres por assunto'] },
    en: { role: 'email marketing expert', item: 'email subject lines about', rules: ['Mix curiosity, benefit and question styles', 'No fake urgency or shouting capitals', 'Maximum 45 characters per subject line'] },
  },
  'customer-support': {
    pt: { role: 'responsável de apoio ao cliente', item: 'respostas rápidas (estilo WhatsApp Business) para clientes sobre', rules: ['Tom simpático, claro e resolutivo', 'Cada resposta indica o próximo passo', 'Máximo 30 palavras por resposta'] },
    en: { role: 'customer support lead', item: 'quick replies (WhatsApp Business style) for customers about', rules: ['Friendly, clear and solution-focused tone', 'Each reply states the next step', 'Maximum 30 words per reply'] },
  },
  freelancers: {
    pt: { role: 'consultor de negócio para freelancers', item: 'linhas de abertura para propostas ou emails de prospeção sobre', rules: ['Foca no resultado para o cliente, não no freelancer', 'Específico e sem exageros', 'Máximo 25 palavras por linha'] },
    en: { role: 'business coach for freelancers', item: 'opening lines for proposals or cold emails about', rules: ['Focus on the client\'s outcome, not the freelancer', 'Specific, no hype', 'Maximum 25 words per line'] },
  },
  'sme-productivity': {
    pt: { role: 'consultor de produtividade para PME', item: 'ações práticas para poupar tempo em', rules: ['Cada ação é concreta e aplicável já esta semana', 'Indica a ferramenta ou o método quando fizer sentido', 'Máximo 20 palavras por ação'] },
    en: { role: 'SME productivity consultant', item: 'practical actions to save time on', rules: ['Each action is concrete and doable this week', 'Name the tool or method where useful', 'Maximum 20 words per action'] },
  },
};

const DEFAULT_PREVIEW = {
  pt: { role: 'especialista em criação de conteúdo e prompts', item: 'ideias práticas sobre', rules: ['Cada ideia deve ser prática e aplicável', 'Linguagem simples e direta', 'Máximo 20 palavras por ideia'] },
  en: { role: 'content and prompt expert', item: 'practical ideas about', rules: ['Each idea must be practical and actionable', 'Simple, direct language', 'Maximum 20 words per idea'] },
};


const getPackPrompt = (packSlug: string, tema: string, isPremium: boolean, en: boolean) => {
  const count = isPremium ? 5 : 2;
  const def = (PREVIEWS[packSlug] ?? DEFAULT_PREVIEW)[en ? 'en' : 'pt'];
  const rules = def.rules.map((r) => `- ${r}`).join('\n');
  return en
    ? {
        system: `You are a ${def.role}. You produce practical, specific results that can be used straight away.`,
        user: `Create ${count} ${def.item} "${tema}".\n\nRules:\n${rules}\n\nFormat:\nReply ONLY with the numbered items, one per line. No introduction or explanation.`,
      }
    : {
        system: `És um ${def.role}. Produzes resultados práticos e específicos, prontos a usar.`,
        user: `Cria ${count} ${def.item} "${tema}".\n\nRegras:\n${rules}\n\nFormato:\nResponde APENAS com os itens numerados, um por linha. Sem introdução nem explicação.`,
      };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;
    // Full pack previews for anyone with premium Prompt Packs access (Pro, Premium, Prompt Packs, admin).
    const isPremium = auth.canAccessPacks;

    const { tema, packSlug, language: reqLanguage, useBrand, brandId } = await req.json();
    const brand = useBrand === false ? null : await resolveTaskBrand(auth.userId, { useBrand, brandId });
    // The language explicitly selected for this task takes precedence over the brand's default language.
    // Brand settings still supply tone, audience and other context, never a forced translation.
    const language = (typeof reqLanguage === 'string' && /^(en|pt)(?:-[a-z]{2})?$/i.test(reqLanguage.trim()))
      ? reqLanguage.trim().toLowerCase()
      : (brand?.language ?? 'pt');
    const en = isEnglishLang(language);

    console.log(`Generating preview for pack: ${packSlug}, tema: ${tema}, isPremium: ${isPremium}`);

    if (!tema || tema.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: en ? "The topic is required" : "O tema é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!packSlug) {
      return new Response(
        JSON.stringify({ error: en ? "The pack is required" : "O pack é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not configured");
      throw new Error("GROQ_API_KEY is not configured");
    }

    const { system, user } = getPackPrompt(packSlug, tema.trim(), isPremium, en);

    console.log("Calling Groq API...");

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
          { role: "system", content: system + brandInstructions(brand, en, false) + outputLanguageRules(language) + plainTextRules(language) },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: en ? "Rate limit exceeded. Please try again in a few seconds." : "Limite de pedidos excedido. Tenta novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: en ? "Insufficient credits." : "Créditos insuficientes. Adiciona créditos à tua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: en ? "Error generating content. Please try again." : "Erro ao gerar conteúdo. Tenta novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("AI response received:", content.substring(0, 100));

    // Parse the numbered list into an array
    const lines = toPlainText(content)
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .map((line: string) => {
        // Remove numbering (e.g., "1.", "1)", "1-", etc.)
        return line.replace(/^\d+[\.\)\-\:]\s*/, '').replace(/^[-•]\s+/, '').replace(/^"(.*)"$/, '$1').trim();
      })
      .filter((line: string) => line.length > 0);

    const totalCount = isPremium ? 5 : 2;
    const results = lines.slice(0, totalCount);

    console.log(`Returning ${results.length} results`);

    return new Response(
      JSON.stringify({ 
        results,
        limited: !isPremium,
        totalGenerated: results.length,
        maxAvailable: 5,
        brand: brand ? { id: brand.id, name: brand.name } : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-pack-preview error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
