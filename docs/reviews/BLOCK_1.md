# Bloco 1: custo e direitos, 2/11/2026

Branch: fix/p0-cost-entitlements. Base: sync/handoff-2026-11-01, 6f95879b555e0d4c3f485fd15514ce22a1e8ad6f.

## Confirmação de produção ANTES da correção

Leitura de get_edge_function, exclusivamente no projeto cwrxbxxfaemcvliasycz. Nenhum endpoint foi invocado, nenhum plano/utilizador alterado.

- test-prompts v16 ACTIVE, SHA256 14e940ef0c1da8178c14300cb12b6d3bc794e1bcd1b35e5ccfbaf36137dc1d9d: autentica, mas não verifica isPremium antes das duas chamadas de IA. O helper publicado calcula isPremium para pro, premium legado e admin.
- optimize-prompt v16 ACTIVE, SHA256 9cafb8b481ffccdf46a1c8e9289d13874c267a4add5e2b1d686ab414741ca2b7: sem contagem de otimizações no servidor.
- Esquema consultado por SELECT: profiles, library_prompts e prompt_run_usage. Sem escrita em produção.

## Alteração

Atualização aprovada na integração release/p0-p1, 2/11: acrescentado teto de 20 otimizações concluídas por conta/dia para Free/Packs, com renovação à meia-noite de Lisboa e reserva atómica conjunta. O SQL neste branch substitui o rascunho anterior ainda não aplicado. Pro/Premium/Admin sem teto.

- test-prompts devolve 403 PRO_REQUIRED antes de ler o pedido ou chamar IA para Free/Packs. Preserva Pro/Premium legado/Admin, conforme auth.isPremium existente.
- Contagem por utilizador e SHA256 do texto normalizado (NFC, quebras de linha e trim). Nunca guarda o texto do prompt nesta tabela nem aceita um identificador arbitrário do browser para reiniciar o limite. Editar o conteúdo cria uma identidade de prompt distinta; não é um limite agregado por conta.
- Free e Packs: 3 sucessos por prompt. Pro/Premium/Admin: sem limite de otimizações. Não altera a quota própria de execuções diárias.
- Reserva atómica com bloqueio de linha e token, válida por 2 minutos; só uma chamada concorrente por prompt. BUSY devolve 409 sem IA. Atingir 3 sucessos devolve 429 sem IA.
- Timeout de IA de 45 segundos. Contador aumenta apenas após resposta válida e commit da reserva. Erro HTTP, JSON inválido, resultado incompleto ou exceção libertam a reserva; token antigo não pode finalizar/libertar um pedido novo. Uma queda abrupta deixa só uma reserva temporária, não um sucesso.
- RLS de leitura própria; sem escrita nem acesso às RPCs para anon/authenticated. RPCs SECURITY INVOKER e EXECUTE apenas service_role. Sem introduzir SECURITY DEFINER.
- UI deixa de usar a contagem local para autorizar/bloquear ou descontar; mostra a contagem devolvida pelo servidor após sucesso/rejeição. Reservas e direitos nunca vêm do cliente.

## Testes

Node 24: npm ci, npm run test:p0, npm run build.

Seis grupos de testes offline, incluindo os handlers reais num runtime isolado com módulos externos e IA simulados. Apenas a identidade QA nmourao+pfpqa1031@mail.grokbot.com. PGlite executa a migração e as funções PostgreSQL numa base temporária local: Free/Packs, Pro/Premium, rejeição sem chamadas ao fornecedor, falha sem desconto, overlap, expiração, tokens antigos, duplo commit, RLS/ACL, normalização e indisponibilidade da quota. PGlite não substitui uma prova de carga/concurrency em PostgreSQL de staging real.

Build passou. ESLint passou nos cinco ficheiros TS/TSX alterados. Avisos de build existentes: Browserslist antigo, chunk >500kB, mistura de imports Paddle e prerender sem Chrome. Sem teste na conta principal.

## Integração futura, sujeita a OK

1. Rever esta migração e aplicar primeiro a uma base de teste; validar também as ACLs/RLS num Supabase de teste.
2. Com OK explícito para produção: aplicar a migração antes de publicar optimize-prompt; publicar test-prompts com o helper de autenticação atual. Não alterar campaign-admin nem auth-send-email.
3. Publicar o frontend correspondente. A ausência da migração faz a nova função falhar fechada com 503, sem chamar a IA.
4. Sem merge/deploy/migração em produção nesta entrega. Sem preview Vercel criado: o pedido exige OK antes de deploy. Nenhum email ou escrita Paddle.

Os contadores locais antigos não são importados: não são dados confiáveis. A contagem verificada começa no servidor após ativação. Não recuperar a versão insegura da função como rollback: corrigir em frente ou suspender a operação enquanto a falha é resolvida.


## Correção posterior em release/p0-p1 (base remota ee8dc18)

A edge transmite auth.isPremium, já resolvido pelo helper incluindo overrides Pro/Premium ativos, para reserve_prompt_optimization(uuid,text,boolean). O SQL deixa de decidir direitos a partir de tabelas de plano. RPC apenas service_role; o corpo HTTP não pode forjar o flag. Teste com perfil Free e override Pro permanente passa 21 sucessos; overrides expirados/Packs não concedem Pro. Testes locais: 12 grupos backend/SQL e 7 UI. Por instrução do Nuno, sem ambiente Supabase de teste, preparar aplicação direta em produção do SQL aditivo apenas depois de validar preview e dar OK explícito, seguida de QA. Não foi aplicada migração nesta correção.
