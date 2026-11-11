-- Formalise the two published bilingual pack templates containing informal second-person address.
-- Staged for review: do not apply to production without approval.
-- Idempotent and scoped to existing prompt_key values; no user content or entitlements are modified.
update public.pack_prompts
set content = 'Elaborar uma publicação de LinkedIn sobre 5 erros frequentes de {{publico}} em {{tema}}, explicando como corrigir cada um numa frase. A abertura deverá apresentar um dado ou uma observação concreta da experiência da organização. Utilizar a terceira pessoa e um tom profissional.',
    content_en = 'Prepare a LinkedIn post about 5 common mistakes made by {{audience}} regarding {{topic}}, explaining how each can be corrected in one sentence. Open with a concrete fact or observation from the organisation''s experience. Use a professional, third-person voice.',
    updated_at = now()
where prompt_key = 'li-post-expertise'
  and content = 'Escreve uma publicação de LinkedIn com 5 erros que {{publico}} comete em {{tema}} e como corrigir cada um numa frase. Abre com um dado ou observação concreta da tua experiência.';

update public.pack_prompts
set content = 'Preparar uma sequência de 3 emails para subscritores de {{negocio}} sem abrir emails há 90 dias: reaproximação através do melhor conteúdo, incentivo de {{incentivo}} e confirmação final do interesse em permanecer na lista. Utilizar um registo profissional e evitar tratamento informal.',
    content_en = 'Prepare a 3-email sequence for {{business}} subscribers who have not opened messages in 90 days: reconnect by sharing the best content, offer an {{incentive}} incentive, and end by confirming interest in remaining subscribed. Use a professional, neutral voice.',
    updated_at = now()
where prompt_key = 'em-winback'
  and content = 'Cria uma sequência de 3 emails para subscritores de {{negocio}} sem abrir emails há 90 dias: "sentimos a tua falta" com o melhor conteúdo, incentivo de {{incentivo}} e último email a perguntar se querem continuar na lista.';
