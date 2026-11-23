# Creem Pro · validação de QA e preparação de Live

**Decisão de lançamento em 23/11/2026:** manter as vendas desativadas até à validação na Creem Sandbox e à aprovação explícita da ativação Live.

## Evidência

- O checkout de partida corresponde a `main` no GitHub (`efc72bd`). A PR #41 já está integrada e o último commit da PR é `7a1ffb0`.
- A partir do ambiente Codex, as ligações HTTPS ao projeto QA, à API de gestão do Supabase e à API Creem Sandbox foram recusadas pelo proxy com HTTP 403 no túnel CONNECT. Não foram detetadas credenciais Supabase ou Creem no processo nem bindings na configuração do ambiente.
- `e2e/creem-billing.test.mjs` executa as Edge Functions, as funções SQL e o corpo do job de expiração em PGlite, com transporte Creem e autenticação simulados. Abrange os planos mensal e anual, o cupão de primeira cobrança, pagamento inicial falhado, assinatura inválida, modo incorreto, ativação, repetição e eventos atrasados, extensão do período pago, atraso no pagamento, cancelamento e expiração. O teste não executa o worker pg_cron nem confirma os payloads e as políticas de reentrega da Creem real.
- O estado remoto descrito para o QA aguarda confirmação direta. Não foram aplicadas migrações nem criadas compras remotas.

## Aplicar o bootstrap no QA

1. Confirmar que o projeto selecionado na ligação Supabase do ChatGPT ou no SQL Editor é `nzhjzdmuevwsaldpqlxd`. Executar [preflight.sql](../../scripts/creem-qa/preflight.sql). A primeira aplicação pressupõe as cinco tabelas públicas identificadas, zero utilizadores, histórico vazio e ausência de pg_cron. Rever os triggers existentes antes de criar contas. Confirmar que não contactam produção nem enviam emails.
2. A partir da raiz deste checkout, gerar o SQL e verificar a suite local.

   ```sh
   node scripts/creem-qa/build-bootstrap.mjs > /tmp/creem-qa-bootstrap.sql
   npm test
   ```

3. Usar o ficheiro gerado como uma única execução SQL no projeto QA, incluindo `begin` e `commit`. Se a ligação do ChatGPT limitar o tamanho da consulta, abrir o ficheiro inteiro no SQL Editor do QA. Uma segunda execução deteta a marca `creem_qa_bootstrap_v1` e preserva os dados. Em caso de erro, rever o esquema real antes de alterar o preflight. O bootstrap não regista migrações na tabela gerida pelo Supabase.
4. Confirmar o marcador com o preflight e verificar as RPCs e o RLS.

   ```sql
   select p.oid::regprocedure as signature,
          has_function_privilege('service_role', p.oid, 'execute') as service_execute,
          has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('reserve_creem_checkout','apply_creem_subscription');

   select relname, relrowsecurity from pg_class
   where relnamespace = 'public'::regnamespace
     and relname in ('subscriptions','creem_checkouts','checkout_attempts','payment_failures');
   ```

5. No QA, republicar `creem-checkout` e `creem-webhook` a partir do commit revisto para aplicar o bloqueio do modo Live. Confirmar o destino explícito. Criar contas de teste confirmadas pela API administrativa sem envio de emails.

   ```sh
   supabase functions deploy creem-checkout --project-ref nzhjzdmuevwsaldpqlxd
   supabase functions deploy creem-webhook --project-ref nzhjzdmuevwsaldpqlxd
   ```

6. Configurar os dois produtos recorrentes na Creem Sandbox, 900 cêntimos por mês e 9000 por ano. O cupão `PRODUCTHUNT20` deve reduzir 20% apenas na primeira cobrança de ambos. Configurar o destino do webhook da sandbox no QA em `/functions/v1/creem-webhook`. Nas definições seguras do QA, usar `CREEM_MODE=test`, `CREEM_API_KEY` e `CREEM_WEBHOOK_SECRET` da sandbox, `CREEM_PRO_MONTHLY_ID`, `CREEM_PRO_ANNUAL_ID` e `CREEM_SITE_ORIGIN` do frontend QA. Confirmar que o frontend aponta para o QA antes de ativar `CREEM_CHECKOUT_ENABLED` e `VITE_CREEM_CHECKOUT_ENABLED` nesse ambiente.
7. Para validar localmente no QA a passagem do período pago sem esperar por um evento, executar manualmente [expire-subscriptions.sql](../../scripts/creem-qa/expire-subscriptions.sql) após o fim do período do caso de teste. O script só toca em subscrições Creem Sandbox vencidas. O agendamento automático de produção requer validação própria.

### Sequência reutilizada

A geração extrai das migrações os blocos de compras e papéis, subscrições, tentativas, eventos, antiabuso, domínios descartáveis, falhas de pagamento, recomputação do plano e RPCs Creem. Antes desses blocos, acrescenta `packs` ao enum QA. Depois, protege o plano de alterações diretas por utilizadores autenticados, instala os triggers de subscrições e compras, ajusta os grants e restringe as duas tabelas de faturação ao modo sandbox. Não importa migrações de dunning, integrações Paddle, backfill de perfis, extensões de rede nem agendamentos. Em particular, as migrações `20261027150000_dunning_cron_schedule.sql` e `20261027220000_cron_secret.sql` contêm referências ao projeto de produção e ficam fora do bootstrap.

## Critérios da validação real

| Cenário | Evidência que deve ser recolhida |
| --- | --- |
| Compra mensal e anual em contas distintas | Checkout acedido apenas na sandbox, moeda EUR, primeira cobrança simulada de 7,20 € e 72 €, respetivamente, com o cupão, e preço normal nos ciclos seguintes. |
| Webhook e ativação | ID e tipo do evento, hora e código HTTP de cada entrega. Confirmar a associação ao utilizador autenticado, uma única linha de subscrição e plano Pro na conta. Confirmar que um evento anterior ao vínculo é reentregue ou reconciliado. |
| Renovação | Evento sandbox de renovação associado à mesma subscrição e data paga até efetivamente prolongada. |
| Pagamento falhado | Na primeira cobrança, conta Free sem subscrição Pro. Numa renovação falhada, sem extensão do período pago. Confirmar os nomes e payloads reais dos eventos e a recuperação de uma cobrança posterior. |
| Cancelamento e expiração | Confirmar o comportamento até ao fim do período pago. Executar o script manual após o fim do período e verificar a remoção do Pro, incluindo o caso sem novo webhook. O agendamento é verificado separadamente antes da ativação Live. |
| Idempotência | Reentregar eventos válidos e verificar que não há linhas duplicadas nem reativação por um evento anterior. |
| Recuperação | Testar a reentrega de um evento após indisponibilidade temporária e confirmar reconciliação entre transação paga, subscrição e perfil. |

Usar exclusivamente meios de pagamento de teste e guardar timestamps, estados, códigos HTTP e referências internas de QA. Evitar incluir segredos, assinaturas, dados de cartões ou dados pessoais no relatório.

## Produção após aprovação explícita

1. Validar em leitura o histórico de migrações, extensões, job de expiração, subscrições Paddle existentes e permissões necessárias no projeto de produção. Preparar backup e plano de reversão antes de qualquer alteração aprovada.
2. Com as vendas desativadas, aplicar apenas as migrações aprovadas que estejam em falta e publicar as funções do commit validado. Configurar produtos, cupão e webhook Live com credenciais próprias. Confirmar que a funcionalidade Free e o acesso dos utilizadores pagos existentes continuam operacionais.
3. Confirmar a monitorização do endpoint de webhook e a reconciliação entre pagamentos, subscrições e planos. Incluir um procedimento de reentrega e recuperação sempre que exista pagamento confirmado sem Pro após a janela operacional acordada.
4. Mediante aprovação de lançamento, ligar o checkout no backend e no frontend. Para travar novas vendas, desligar primeiro `CREEM_CHECKOUT_ENABLED`; manter a receção dos webhooks ativos para processar pagamentos já iniciados.
