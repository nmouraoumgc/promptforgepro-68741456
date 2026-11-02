# Bloco 2: confiança, 2/11/2026

Branch: fix/p1-product-trust. Base independente: sync/handoff-2026-11-01, 6f95879b555e0d4c3f485fd15514ce22a1e8ad6f. Não contém os commits do Bloco 1 nem de last used. Não deve ser publicado isoladamente sobre a correção P0: é necessário integrar preservando a quota do Bloco 1.

## Diff resumido

- Criar: escolha de marca local à tarefa, partilhada entre Rápido, Detalhado e Otimizar; Sem marca envia brandId=null/useBrand=false. Não chama set_active_brand_profile nem as mutações de marca. As opções existentes continuam a ser geridas no Cofre de marca.
- Mostra nome, produto/serviço, público, tom, palavras-chave/proibidas e idioma da marca que serão enviados. Aplica-se à próxima geração, não altera um resultado já criado. A escolha é mantida durante a tarefa aberta, não como nova preferência global.
- Aviso local de possível conflito de setor/idioma, sem enviar o texto a classificadores nem analytics. É uma heurística limitada aos setores/idiomas reconhecidos; não é uma deteção universal nem impede continuar.
- Três handlers (quick-prompt, generate-prompt, optimize-prompt) resolvem o brandId explicitamente escolhido, sempre com user_id autenticado no filtro. ID inválido/inacessível devolve 400, sem fallback para outra marca. Mantém compatibilidade com clientes antigos que omitem a escolha. Idioma da tarefa prevalece sobre o idioma predefinido da marca.
- Visitante em Preços: Free passa a Começar grátis e abre signup; Plano atual só para sessão autenticada. Selecionar Free noutra sessão não altera direitos locais nem dados de subscrição.
- Todos os três contactos support@ do site foram trocados por geral@promptforgepro.me, incluindo Termos, Privacidade e Reembolsos.
- Exemplo de 92% e modal do Painel identificados como Exemplo ilustrativo, em PT e EN.
- Pesquisa: opção proposta e implementada é ligar à Biblioteca. Enter navega com termo codificado em ?q=; a Biblioteca lê/edita esse termo, mostra resultados e estado sem correspondências com Limpar pesquisa. Sem campo inerte para visitantes sem sessão.
- Landing e Preços: explicação comum de gerar, otimizar e executar; Free/Packs 3 otimizações concluídas por prompt, até 20 por conta/dia, e 5 execuções/dia; Pro sem limite por prompt para otimizar e 100 execuções/dia. Renovação das execuções à meia-noite de Lisboa. Os termos referem-se aos planos atuais, sem alterar direitos de compradores Premium legados.
- Aprender e lições passam para as rotas públicas. Progresso é lido/escrito só com sessão; Abrir no Criar/Otimizador e guardar progresso levam ao login com regresso à lição. Não se coloca conteúdo pago no bundle nem se altera RLS.

## Confirmação de Aprender em produção

SELECT apenas, no projeto cwrxbxxfaemcvliasycz. Existem 18 lições ativas, quatro gratuitas. anon já tem SELECT no catálogo e conteúdos; as políticas Active lessons are public e Free lessons or entitled users restringem os corpos a lições gratuitas ou contas com direito. Portanto não é necessária migração para abrir estes percursos. A política paga não foi relaxada.

## Validação

- npm ci; npm run test:p1: sete testes offline de componentes/percurso e resolução de marca.
- Fixtures só com a identidade nmourao+pfpqa1031@mail.grokbot.com ou visitante anónimo. Sem sessão da conta principal, pedidos de IA, emails, compras ou escritas Paddle. Todas as chamadas DB inesperadas falham o teste; mutações globais são proibidas nas fixtures.
- Casos: estado de marca partilhado e Sem marca sem mutação global; contexto/aviso; pesquisa por Enter e codificação; resultados/zero resultados; CTA Free visitante versus QA autenticado; catálogo/lição grátis e gates de ações/progresso; resolução de marca por proprietário, IDs inválidos e recusa de seleção inacessível.
- Componentes Radix de seletor/menu são substituídos no renderer offline. Estes testes verificam lógica e navegação, não o comportamento visual de portais nem o teclado num browser real.
- npx tsc --noEmit --project tsconfig.app.json passou; build passou. ESLint dos componentes novos e áreas alteradas sem erros. Revisão React de hooks, estado por tarefa, nomes acessíveis e chamadas sem dependências em série.
- Build conserva os avisos preexistentes de Browserslist, tamanho de chunk, imports Paddle e prerender sem Chrome. Sem preview Vercel novo, pois não foi autorizado deploy.

## Integração e limites

Depois de revisão e OK: integrar preservando o guard Pro e withOptimizationQuota do Bloco 1, além das alterações de marca deste bloco, no optimize-prompt e no frontend. Não substituir a função P0 pela versão deste branch, que parte obrigatoriamente do handoff. Publicar os três handlers com suporte a brandId antes da UI que permite escolher uma marca não ativa. A migração P0 deve preceder o seu handler.

Nenhum merge, deploy ou migração em produção foi feito. O Bloco 3 não foi iniciado. O piloto de terça, 3/11/2026 às 14:00 de Lisboa, tem prioridade e continua a exigir dry-run e OK no momento; este bloco não cria agendamentos nem envios. campaign-admin v5 e auth-send-email não foram alteradas.
