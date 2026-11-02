# Release P0 + P1: checklist de produção

Data: 2/11/2026. Branch exclusivo de integração: release/p0-p1. Origem: sync/handoff-2026-11-01 (6f95879), P0 c326d77 e P1 5acb647.

## Correção plan_overrides em 2/11/2026

Base desta correção: release/p0-p1 remoto ee8dc181882c516f5113013a7c1fc9ce646d2ca3, publicado pelo El Patron. O helper de autenticação resolve auth.isPremium a partir do perfil, Admin e overrides Pro/Premium ativos (permanentes ou com expires_at futuro). Overrides expirados não acrescentam direitos. A edge envia exclusivamente esse resultado como _is_premium para a RPC; nunca lê essa decisão do corpo HTTP. O SQL não consulta profiles, user_roles ou plan_overrides para decidir direitos. RPCs continuam reservadas à service_role. Um override não remove direitos já concedidos pelo perfil ou por uma subscrição refletida nele.

A assinatura é reserve_prompt_optimization(uuid,text,boolean). Este é o rascunho único ainda não aplicado; não aplicar o SQL antigo de ee8dc18. As duas tabelas são novas e não se altera nem apaga qualquer tabela de negócio existente.

## Alteração aprovada em 2/11/2026

Free e Packs: até 3 otimizações concluídas por prompt e 20 por conta/dia, com renovação à meia-noite de Lisboa. As duas condições são aplicadas na mesma reserva atómica. A linha da conta/dia é bloqueada antes da linha do prompt em todas as reservas e finalizações, evitando ultrapassar 20 através de prompts diferentes. Reservas ativas ocupam capacidade, mas não contam como sucessos; falhas libertam capacidade e leases expiradas não a bloqueiam. SQL apenas preparado, ainda não aplicado.

## Estado e limites desta entrega

- Integração local concluída, preservando guard Pro, quota transacional, respostas sem detalhes privados e seleção de marca por tarefa.
- npm test: doze grupos de backend/SQL (incluindo regressão integrada marca + quota) e sete testes de UI passaram.
- Migração P0 apenas testada em PGlite local. NÃO aplicada em Supabase/produção.
- O preview é exclusivamente frontend. As edge functions publicadas continuam nas versões existentes; o preview não prova a ativação da quota ou de brandId no backend. A contagem P0 e a seleção de marca no servidor foram validadas offline. Não existe ambiente Supabase de teste. Por instrução do Nuno, a migração aditiva fica preparada para aplicação direta em produção só depois de validar o preview e dar OK explícito; a validação real subsequente usa exclusivamente a conta QA.
- GitHub: tentativa de escrita recusada pelo conector com 403 Resource not accessible by integration; o ambiente Git não tem credencial para push. O branch fica local até corrigir o acesso de escrita. O projeto Vercel não está ligado a este repositório; o preview é preparado por upload do código frontend, sem configurar ligação Git ou produção.
- Build: fallback SPA para rotas públicas quando o builder não tem Chrome, preservando os rewrites.
- Sem alteração de main, sem emails e sem escritas Paddle. Bloco 3 não iniciado.
- Testes usam exclusivamente fixtures QA nmourao+pfpqa1031@mail.grokbot.com ou visitante. Scripts e2e antigos que invoquem contas reais, pagamentos ou envios não são executados; a suite reproduzível aprovada está em npm test.

## SQL exato para revisão

A única migração P0 desta release é [20261102120116_prompt_optimization_usage.sql](../../supabase/migrations/20261102120116_prompt_optimization_usage.sql).

Não usar supabase db push sem revisão: o handoff pode conter outras migrações pendentes. Aplicar apenas o SQL aprovado. O SQL não contém dados de utilizadores nem segredos. Cria duas tabelas de contagem (por prompt e por conta/dia), com RLS e duas RPCs SECURITY INVOKER reservadas à service_role. Não migra contadores antigos do browser, que não são confiáveis. A identidade de prompt é o SHA256 do texto normalizado; editar o conteúdo cria uma identidade distinta. Além do limite vitalício de 3 por prompt, Free e Packs têm um teto agregado de 20 sucessos por conta/dia. Pro, Premium legado e Admin não têm teto de otimizações. O dia e a renovação são calculados em Europe/Lisbon, incluindo mudanças de hora. A reserva é debitada no dia em que começou; uma finalização logo após a meia-noite pertence ao dia reservado e não reduz o novo teto diário.

Só após validação do preview e OK explícito do Nuno, com a ligação do projeto de PRODUÇÃO permitido já configurada num ambiente seguro, o comando preparado é:

```bash
psql "$PFP_PRODUCTION_DATABASE_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/20261102120116_prompt_optimization_usage.sql
```

Não executar em produção nesta fase. Não colocar a ligação ou valores de segredos no Git, argumentos literais, chat ou logs.

## Antes de qualquer passagem a produção

- [ ] Nuno valida o preview e aprova explicitamente a passagem a produção deste código e deste SQL.
- [ ] Confirmar projeto cwrxbxxfaemcvliasycz, equipa Vercel team_c1h9Lh2e2QSW5Zp0sHsAAWmT e projeto prj_43m5wJTOoAycMJ42UdmaIeYaV7ik.
- [ ] Confirmar o SHA/tree aprovado e checkout limpo; voltar a executar npm ci, npm test, verificação de tipos e build.
- [ ] Rever os testes locais PGlite e o SQL exato. Não existe Supabase de teste; a aplicação direta em produção e a validação QA posterior exigem o OK explícito acima.
- [ ] Confirmar backup recuperável e eventual presença anterior da tabela/RPCs; se houver uma aplicação parcial, parar e rever. Não contornar CREATE TABLE com IF NOT EXISTS.
- [ ] Planear fora da preparação/envio do piloto de 3/11 às 14:00, que tem prioridade. Nenhum envio sai desta checklist.

## 1. Migração, primeiro

- [ ] Só depois de validar o preview e do OK explícito, aplicar exclusivamente o ficheiro SQL atualizado aprovado, numa transação, ao projeto permitido. Não aplicar outras migrações pendentes.
- [ ] Verificar existência da tabela, PK, CHECKs, RLS nas duas tabelas, políticas de leitura própria e ausência de escrita para anon/authenticated.
- [ ] Verificar que apenas service_role tem EXECUTE nas RPCs de reserva/finalização; não tornar funções SECURITY DEFINER.
- [ ] Depois da publicação das funções no passo 2, validar na QA a renovação à meia-noite de Lisboa e que o limite por prompt se mantém no dia seguinte. Validar que uma falha não aumenta successes e que duas chamadas concorrentes não ultrapassam o limite. Não testar a vulnerabilidade antiga publicada.
- [ ] Registar quem aplicou, quando e o SHA256 do ficheiro; reconciliar a história de migrações pelo procedimento aprovado, sem aplicar outras migrações.

## 2. Edge functions, depois

- [ ] Publicar a partir deste branch integrado, não dos branches P0/P1 separados.
- [ ] Publicar test-prompts com o helper auth atualizado, que considera overrides ativos, e o guard auth.isPremium; Free/Packs devem devolver 403 antes de chamar IA. Pro/Premium legado/Admin mantêm o direito definido pelo helper existente.
- [ ] Publicar quick-prompt e generate-prompt com resolveTaskBrand filtrado pelo utilizador autenticado.
- [ ] Publicar optimize-prompt integrado com o helper auth atualizado e chamada reserve_prompt_optimization com _is_premium=auth.isPremium: resolveTaskBrand + withOptimizationQuota + timeout e limpeza de reservas. Não perder a quota ao publicar a marca.
- [ ] Confirmar as versões e hashes publicados. A ausência/indisponibilidade das RPCs deve devolver 503 e não chamar IA.
- [ ] Verificar na QA rejeições, três sucessos Free/Packs por prompt e quarto bloqueado; 20 sucessos por conta/dia e 21.º bloqueado; concorrência entre prompts diferentes; falha sem desconto, Sem marca e recusa de IDs de marca não acessíveis. Os cenários de planos foram cobertos pelas fixtures locais. Em produção, usar só a QA e os direitos que já tiver; não editar o plano, criar overrides, alterar subscrições ou escrever no Paddle sem autorização separada. Não fazer os cenários restantes em contas de clientes. Se a QA não tiver os estados necessários, registar a cobertura que falta e pedir aprovação específica para uma alteração temporária da QA.
- [ ] Não republicar campaign-admin, auth-send-email ou funções de pagamento/email. campaign-admin v5/9fb323c é obrigatório se uma intervenção futura autorizada lhe tocar.

## 3. Frontend, só no fim

- [ ] Confirmar que a migração e as quatro edge functions estão verificadas antes de qualquer merge/deploy que possa disparar o frontend.
- [ ] Só com OK para produção: publicar o frontend do código aprovado, com ambiente production e configuração de produção confirmados.
- [ ] Se for usado merge para main com deploy automático, fazê-lo apenas neste passo, depois do backend. Não fazer merge antecipadamente para preparar a publicação.
- [ ] Verificar domínio principal, versão do build, preços sem sessão, pesquisa, Aprender público, gates pagos e marca por tarefa com QA.
- [ ] Registar URL/ID, commit, versão das funções e resultado dos testes QA efetivamente executados. Não promover cegamente um preview com variáveis diferentes.

## Contingência

- Se a migração falhar, a transação deve reverter; não publicar as funções dependentes.
- Se houver falha no backend, suspender o lançamento do frontend e corrigir sem voltar a abrir o acesso Pro ou remover a quota. Não fazer rollback automático para endpoints vulneráveis.
- A tabela de quota é aditiva. Não a apagar nem repor contadores como rollback sem revisão e autorização.
- Se só o frontend falhar depois do lançamento, repor o frontend anterior mantendo os controlos de servidor.

## Piloto e próximos blocos

O piloto de terça, 3/11/2026 às 14:00 de Lisboa, mantém a prioridade, com dry-run e OK explícito do Nuno no momento. Não está incluído qualquer envio, agendamento ou alteração da rotina El Patron. Bloco 3 apenas depois de validação do preview e aprovação de produção.
