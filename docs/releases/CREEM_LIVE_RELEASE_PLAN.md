# Creem Live — implementação preparada, validação de DDL pendente

Data de preparação: 2026-11-23. **Este documento não autoriza merge, deploy, alterações de produção ou ativação de Live.**

## Preflight de produção autenticado — 2026-11-23 (READ ONLY)

Consulta direta realizada no Supabase de produção `cwrxbxxfaemcvliasycz` através da ligação autenticada Primary; **a limitação HTTP 401 do executor Codex foi ultrapassada nesta revisão**. Nenhuma instrução DDL/DML foi executada.

- PostgreSQL de produção 17.6; fixture Codex testada em PostgreSQL 17.12 (mesma versão major).
- Histórico remoto: última migration `20261120104411_payment_reopening_waitlist`; as migrations Creem `20261122120000`, `20261123160000`, `20261123170000`, `20261123180000` **não estão aplicadas**.
- Tabela `subscriptions`: 44 registos Paddle Live (38 `active`, 6 `canceled`); os 44 têm ambos os identificadores Paddle preenchidos, pelo que respeitam a nova constraint `subscription_billing_provider`. As colunas Paddle têm `NOT NULL` e a migration inicial retira essa obrigação apenas para aceitar linhas Creem; o índice UNIQUE Paddle mantém-se.
- `checkout_attempts`: `id uuid` default `gen_random_uuid()`, `status` default `initiated`, `ip_hash` e `discount_code` presentes, respetivas constraints compatíveis. `payment_failures` inclui `source` e `ip_hash`.
- `creem_checkouts`, `creem_sync_leases`, RPCs `reserve_creem_checkout` e `apply_creem_subscription` não existem ainda; não há colisões de definições.
- Trigger `trg_sync_plan_from_subscription` executa `sync_profile_plan_from_subscription()` após INSERT/UPDATE/DELETE. A função `recompute_profile_plan(uuid)` existente tem a mesma estrutura de direitos prevista na migration de serialização e utiliza `plan_type`. `service_role` tem EXECUTE na função e escrita/leitura em `subscriptions`.
- `pg_cron` instalado; nenhum job Creem/`expire-creem-pro` já existe (somente `recompute-expired-overrides-hourly` correspondeu ao filtro de expiração).
- **Resultado: DDL/histórico e dependências de base compatíveis com a sequência de migrations proposta; bloqueio de leitura de produção resolvido.** Isto não equivale a aplicar migrations nem a aprovar cobranças Live. A análise de dados foi baseada em consultas reais de leitura, não apenas na fixture.

## Evidência disponível

- PR #42 `d705734`: FINAL QA PASSED WITH OPERATIONAL LIMITATION. Reconciliação manual real não demonstrada por falta de credenciais no executor; compras, reentregas, cancelamentos e leases verificados no QA.
- Produção Supabase `cwrxbxxfaemcvliasycz`: 44 subscrições Paddle `live`, das quais 38 `active` e 6 `canceled`. 40 perfis Pro. 38 `active` identificadas como `pro_monthly`; 3 com `cancel_at_period_end=true`. 18 subscrições ativas terminam em 2026-11-30, 7 em 12-01, 6 em 12-02, 3 em 12-03, 2 em 12-04, 1 em 12-06 e 1 em 12-09. São períodos registados na BD, não prova de cobrança futura.
- Produção não tem Edge Functions `creem-checkout` / `creem-webhook` publicadas. Última migração listada `payment_reopening_waitlist` (20261120104411). Paddle permanece operacional no esquema legado.
- Vercel produção: `promptforgepro` em `main`, URL Supabase aponta para o projeto de produção. `VITE_CREEM_CHECKOUT_ENABLED` não foi confirmada como configurada.
- PR #42 **não é release de produção**: inclui bootstrap QA específico, sem representar integralmente a sequência de migrations já existente em `main`.

## Bloqueios a resolver na implementação

1. **Comparar DDL real**: extrair dependências Creem de migrations já presentes em `main`, confirmar existência e assinaturas de `reserve_creem_checkout`, `apply_creem_subscription`, `subscriptions.creem_*`, `creem_checkouts`, `creem_sync_leases`, triggers de recomputação e políticas. Criar migration de produção *mínima, transacional e compatível*; nunca executar `scripts/creem-qa/bootstrap.sql.in` nem scripts de expiração QA em produção. Não reaplicar definições de funções que regrediriam a serialização.
2. **Preservar Paddle**: não apagar, substituir, alterar ou reclassificar linhas Paddle; preservar o Pro até ao termo contratado. Confirmar como `recompute` agrega subscrições de fornecedores diferentes; uma Creem cancelada não pode revogar Pro ainda válido por Paddle. Validar concorrência de subscrições por utilizador e `ON CONFLICT` antes de qualquer deploy.
3. **Não cobrar clientes legados automaticamente**: novos checkouts Creem exigem consentimento explícito e novo meio de pagamento. Evitar checkout imediato para utilizadores já Pro se isso provocar sobreposição de períodos pagos; oferecer conversão com início posterior ou aviso claro, sujeito a confirmação do modelo suportado pela Creem.
4. **Segredos e modos**: segredos Creem Live exclusivamente no projeto de produção, nunca na Vercel pública. `CREEM_MODE=live`, IDs dos produtos Live €9/€90, webhook Live e origem do site. Confirmar `CREEM_CHECKOUT_ENABLED=false` inicialmente; `VITE_CREEM_CHECKOUT_ENABLED=false` no primeiro deploy. Não registar valores secretos em logs, PR ou respostas.
5. **Webhook**: assinatura HMAC, produto e ambiente, autenticação do checkout, `verify_jwt=false` apenas quando a assinatura/token forem validados no handler. Serialização lease→GET Creem→commit, falhas com retry. Garantir que os eventos da Sandbox nunca são aceites em produção.
6. **Expiração e renovação**: confirmar agendamento existente, escopo do job, efeito sobre Paddle e Creem, e que `scheduled_cancel` mantém Pro até ao termo e `canceled` revoga apenas o direito Creem. Rever comportamento de `past_due`, renovação perdida e reconciliação operacional.
7. **Verificar checkout real**: validar produtos Live, preços, IVA/impostos e `PRODUCTHUNT20` (20% na primeira cobrança apenas) no painel Creem antes da ativação. O estado da aprovação da conta Live tem de ser confirmado no fornecedor, não inferido do QA.

## Plano de deployment (exige autorização explícita)

1. Aprovar revisão de DDL, diff da PR de produção, backup/snapshot e plano de migração. Recolher contagens e integridade Paddle antes da escrita.
2. Aplicar migrations de produção, mantendo checkout OFF. Confirmar SQL, RLS, RPCs, triggers e contagens Paddle inalteradas.
3. Configurar segredos Creem Live em Supabase e publicar apenas funções necessárias, ainda com checkout OFF. Verificar endpoint de webhook sem enviar eventos falsos.
4. Publicar frontend com gate OFF. Confirmar Free, Pro existente, waitlist e conteúdos sem regressões.
5. Ativar backend para compra Live controlada com utilizador novo, após aprovação. Testar mensal/anual conforme plano autorizado, incluindo webhook→Pro→conteúdo e reconciliação/rollback. Não criar cobranças sem autorização específica.
6. Ativar frontend e monitorizar checkouts, eventos, perfis, retries e leases. Preparar comunicação de migração voluntária para utilizadores Paddle.

## Rollback

- Fechar imediatamente `CREEM_CHECKOUT_ENABLED` e gate frontend; bloquear novos checkouts.
- Reverter deployment frontend se necessário; **não apagar** pagamentos ou subscrições Creem/Paddle já criados.
- Manter webhook ativo para processar eventos de subscrições Live existentes, mesmo com checkout OFF; não remover segredos necessários a esses eventos.
- Migrations com dados não devem ser revertidas destrutivamente. Corrigir com migration forward e restauro controlado apenas se comprovadamente necessário.
- Verificar perfis Pro, tentativas, eventos e leases após mitigação.

## Aceitação GO/NO-GO

**DDL PREFLIGHT PASSED / DEPLOYMENT NOT AUTHORIZED**: o esquema real foi confrontado em leitura e mostrou compatibilidade estrutural com as migrations. Antes do deploy continuam obrigatórios revisão/aprovação da PR, backup/snapshot e autorização explícita para merge/deploy. Antes de qualquer compra Live são ainda obrigatórios credenciais e produtos Live confirmados, gates controlados e autorização da transação.

**Não executado em produção**: migrations, deploy, compras Live, comunicação a clientes, alterações de dados ou merge da PR #42.

## Implementação entregue

O branch inclui o protocolo de leases de d705734, reconciliação independente do ambiente e testes de coexistência de fornecedores. Não inclui bootstrap ou scripts exclusivos do QA.

Aplicar após autorização, somente as migrations pendentes e nesta ordem, depois de executar a leitura scripts/billing/production-preflight.sql e confrontar o histórico real.

1. 20261122120000_creem_pro.sql adiciona colunas e vínculos Creem e agenda expiração exclusiva de linhas Creem.
2. 20261123160000_creem_serial_sync.sql instala leases e impede gravações diretas pela função antiga.
3. 20261123170000_creem_paid_source_checkout_guard.sql verifica direitos pagos diretamente, reutiliza links abertos sem presumir expiração local e bloqueia outros produtos/cupões ou tentativas incertas enquanto existir uma ligação potencialmente pagável.
4. 20261123180000_billing_plan_serialization.sql serializa a recomputação de planos por utilizador para ambos os fornecedores.

Publicar creem-checkout, creem-webhook, customer-portal, pre-checkout-check e dunning-cron deste branch, conservando funções Paddle. Manter CREEM_CHECKOUT_ENABLED=false e VITE_CREEM_CHECKOUT_ENABLED=false durante todo o deployment inicial. O webhook mantém verify_jwt=false com assinatura validada no handler.

Configurar CREEM_MODE=live, CREEM_API_KEY, CREEM_WEBHOOK_SECRET, CREEM_PRO_MONTHLY_ID, CREEM_PRO_ANNUAL_ID e CREEM_SITE_ORIGIN no secret store Supabase de produção. Confirmar produtos EUR 9/90 e PRODUCTHUNT20 de primeira cobrança no fornecedor. Credenciais nunca pertencem ao frontend. O checkout rejeita produtos e cupões incompatíveis antes de devolver a ligação.

## Recuperação operacional

Injetar CREEM_API_KEY e SUPABASE_SERVICE_ROLE_KEY no executor seguro. Selecionar explicitamente CREEM_MODE=live e SUPABASE_URL=https://cwrxbxxfaemcvliasycz.supabase.co e executar node scripts/billing/reconcile-checkout.mjs seguido do ID de checkout existente. O mesmo protocolo de lease serializa webhook e recuperação. Confirmar o vínculo, a subscrição, o perfil e a ausência de leases após sucesso. Uma falha deixa o lease expirar em 60 segundos.

Monitorizar entregas não 2xx e divergências entre pagamentos confirmados e direitos. Reentregar primeiro e reconciliar se necessário. Uma tentativa incerta de criação de checkout bloqueia novos links até confirmar no fornecedor que o anterior não pode produzir outra cobrança. Não eliminar vínculos para contornar esse bloqueio.

No rollback fechar ambos os gates e manter o webhook compatível com leases. A migração retira o acesso direto à RPC antiga, pelo que restaurar o webhook anterior quebraria o processamento. Preservar subscrições e corrigir por migrations aditivas.

## Evidência e limite de aprovação

As migrations foram exercitadas em base isolada PostgreSQL 17.12 e numa fixture automatizada com 44 subscrições Paddle, 38 ativas, preservando linhas e direitos. Os testes verificam que a revogação Creem não remove direitos Paddle válidos e que um perfil desatualizado não permite nova compra sobre uma subscrição paga. A evidência Sandbox anterior é reutilizada.

A sessão inicial do Codex recebeu HTTP 401, mas o preflight foi concluído posteriormente através da ligação Supabase autenticada, sem escrita, com resultados documentados na secção acima. A autorização para merge/deployment e a ativação Live continuam etapas distintas e pendentes.

## Resultado da revisão e testes

A suite completa executou 46 testes com sucesso. O teste adicional de duas ligações PostgreSQL 17.12 confirmou que a segunda fonte paga espera pelo lock da primeira e que o plano final permanece Pro. A fixture conserva os 44 registos Paddle completos após as migrations e a expiração Creem. Também verifica a reutilização do mesmo link após duas horas, a recusa de outro produto/cupão e o bloqueio de tentativas incertas.

Falhas anteriores ao pedido de criação do checkout são registadas como failed, permitindo nova tentativa sujeita aos limites de segurança existentes. Falhas após o pedido ficam abandoned por poder existir um checkout no fornecedor. Para um link comprovadamente expirado, um operador deve confirmar na Creem que não houve pagamento e que a ligação está terminal e não pode voltar a cobrar. Só então pode atualizar a tentativa específica para failed, preservando o vínculo para auditoria. Não libertar tentativas cujo resultado ainda seja desconhecido.

O bloqueio anterior de leitura de produção foi resolvido em 2026-11-23. A compatibilidade estrutural do DDL e histórico foi confirmada em leitura; a PR permanece Draft e não está autorizada para merge/deploy. Segredos e produtos Live são configurações obrigatórias da fase de deployment, inicialmente com checkout desligado.
