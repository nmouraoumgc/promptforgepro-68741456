# Creem Live — release controlada (DRAFT / NO-GO)

Data de preparação: 2026-11-23. **Este documento não autoriza merge, deploy, alterações de produção ou ativação de Live.**

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

**NO-GO até**: migration de produção revista e testada contra cópia compatível do esquema real; proteção multi-provider provada; segredos e produtos Live confirmados; plano de proteção dos 38 ativos; revisão do código; autorização explícita para merge/deploy e para compra Live controlada.

**Não executado nesta PR**: migration, deploy, compras Live, comunicação a clientes, alterações em produção ou merge da PR #42.
