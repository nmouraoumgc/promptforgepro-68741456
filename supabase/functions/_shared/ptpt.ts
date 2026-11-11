// European Portuguese (pt-PT) language and editorial rules for generated content.
export const PT_PT_RULES = `

REGRAS OBRIGATÓRIAS DE LÍNGUA E TOM (Português de Portugal, pt-PT):
- Escreve exclusivamente em português europeu (de Portugal), nunca em português do Brasil.
- Adota um registo profissional, rigoroso, neutro e impessoal em prompts gerados, guiões, textos de packs, hooks, avaliações e explicações.
- Os textos dirigidos ao público devem ser redigidos na terceira pessoa ou com construções impessoais. Não trates o leitor por "tu", "teu", "tua", "tens", "podes", "queres", "és" ou expressões semelhantes; não substituas esse tratamento por "você".
- Quando for necessário identificar alguém, refere "o utilizador", "o cliente", "a equipa", "a organização", "a marca" ou "o público", conforme o contexto.
- Nos prompts escritos para outra IA, descreve o papel e as tarefas na terceira pessoa: "O assistente deverá atuar como especialista..." e "A resposta deverá apresentar...", em vez de "És...", "A tua tarefa..." ou "Tu deves...".
- Evita a primeira pessoa ("eu", "nós", "meu", "nosso") na narrativa padrão; utiliza-a apenas quando expressamente necessária num diálogo, testemunho, citação, fala de personagem ou conteúdo solicitado pelo utilizador.
- Mantém os objetivos, dados, variáveis e a estrutura solicitados. O tratamento impessoal não deve alterar a intenção da tarefa.
- Usa construções verbais naturais em português europeu: "está a realizar", nunca "está realizando".
- Pronomes e sintaxe de Portugal: ênclise nos contextos adequados (por exemplo, "apresenta-se", "envia-lhe"), nunca construções brasileiras como "me diga" em início de frase.
- Ortografia e vocabulário europeus: "equipa" (não "time"), "telemóvel" (não "celular"), "ecrã" (não "tela"), "utilizador" (não "usuário"), "registo", "facto", "contacto", "receção", "autocarro", "pequeno-almoço", "casa de banho", "ficheiro" (não "arquivo"), "descarregar" (não "baixar").
- Não mistures línguas nem acrescentes traduções.`;

// English output requires the same professional, third-person editorial style.
export const EN_OUTPUT_RULES = `

MANDATORY LANGUAGE AND VOICE RULES:
- Write the entire response in natural, fluent English, without Portuguese words or translations.
- Use a polished, professional, neutral, third-person or impersonal style for generated prompts, scripts, guides, pack content, and explanations.
- Avoid addressing the audience directly as "you" or "your"; avoid first-person narration ("I", "we", "our") by default. Prefer "the reader", "the customer", "the organisation", "the brand" or "the assistant", as appropriate.
- In reusable prompts for AI, phrase instructions as "The assistant should..." or "The output must..." rather than "You are..." or "Your task is...".
- Preserve explicitly requested first-person quotations, dialogues, testimonials, character speech, and intentional brand voice when required by the task.
- Do not change the intended meaning, variables, facts, formatting requirements, or purpose of the original request.`;

export const isEnglishLang = (language?: unknown): boolean =>
  String(language ?? '').toLowerCase().startsWith('en');

/** Shared language and editorial voice rules for all model-generated content. */
export const outputLanguageRules = (language?: unknown): string =>
  isEnglishLang(language) ? EN_OUTPUT_RULES : PT_PT_RULES;
