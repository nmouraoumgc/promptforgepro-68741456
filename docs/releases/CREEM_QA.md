# Creem Pro · validação de QA e preparação de Live

**Decisão de lançamento em 23/11/2026:** manter as vendas desativadas até à validação na Creem Sandbox e à aprovação explícita da ativação Live.

## Evidência

- O checkout de partida corresponde a `main` no GitHub (`efc72bd`). A PR #41 já está integrada e o último commit da PR é `7a1ffb0`.
- A partir do ambiente Codex, as ligações HTTPS ao projeto QA, à API de gestão do Supabase e à API Creem Sandbox foram recusadas pelo proxy com HTTP 403 no túnel CONNECT. Não foram detetadas credenciais Supabase ou Creem no processo nem bindings na configuração do ambiente.
- `e2e/creem-billing.test.mjs` executa as Edge Functions, as funções SQL e o corpo do job de expiração em PGlite, com transporte Creem e autenticação simulados. Abrange os planos mensal e anual, o cupão de primeira cobrança, pagamento inicial falhado, assinatura inválida, modo incorreto, ativação, repetição e eventos atrasados, extensão do período pago, atraso no pagamento, cancelamento e expiração. O teste não executa o worker pg_cron nem confirma os payloads e as políticas de reentrega da Creem real.
- O preflight remoto da PR #42 confirmou cinco tabelas, zero utilizadores e migrações, ausência de pg_cron e os tipos, colunas e trigger descritos abaixo. Esse preflight foi anterior à aplicação do bootstrap e às compras iniciais.

## Estado após a aplicação remota

Segundo a confirmação publicada na PR #42, o projeto QA tem a migração `20261123112850_creem_qa_bootstrap_v1_20261123` aplicada e as funções `creem-checkout` e `creem-webhook` estão ACTIVE v2. As permissões das RPCs Creem, RLS e restrições Sandbox foram verificadas nessa sessão. Ambas as funções foram publicadas com `verify_jwt=false`: o checkout valida o token no handler e o webhook valida a assinatura Creem. **Não repetir o bootstrap para iniciar os testes Sandbox.**

A API Creem Sandbox e a API REST do Supabase QA responderam HTTP 401 aos pedidos sem credenciais nesta sessão. As quatro compras iniciais foram confirmadas pelo utilizador numa sessão com acesso. A matriz abaixo lista os cenários remotos ainda pendentes.

### Ajuste de permissões no QA

Aplicar [harden-definer-grants.sql](../../scripts/creem-qa/harden-definer-grants.sql) numa única execução no projeto QA já inicializado. O script retira o acesso anónimo a `has_role` e retira o EXECUTE de clientes a `qa_create_profile`. Mantém `has_role` para as políticas RLS de compras autenticadas e para o `service_role`. A função continua a aceitar um identificador de utilizador. Uma revisão das consultas de papéis feitas por utilizadores autenticados fica fora deste ajuste.

O formulário de inscrição usa `is_disposable_email` antes de iniciar sessão, e as funções de checkout usam-na no servidor. Mantêm-se os grants necessários aos dois caminhos. O aviso sobre tabelas com RLS sem políticas é esperado para tabelas de acesso exclusivo do serviço. Os avisos de desempenho ficam separados deste ajuste.

Os testes locais verificam a reaplicação da correção, o acesso do administrador autenticado às compras, o isolamento do utilizador comum, a validação de email sem sessão e a criação de perfis sob o papel de administração de Auth. Os 43 testes de `npm test` passaram. Em PostgreSQL 17.12, uma verificação separada confirmou a reaplicação, a criação de perfis pelo administrador de Auth, o acesso de compras pela política de administrador e a validação de email anónima. A confirmação destas permissões no QA remoto continua pendente.

## Aplicar o bootstrap num QA por inicializar

1. Confirmar que o projeto selecionado na ligação Supabase do ChatGPT ou no SQL Editor é `nzhjzdmuevwsaldpqlxd`. Executar [preflight.sql](../../scripts/creem-qa/preflight.sql). A primeira aplicação pressupõe as cinco tabelas públicas identificadas, zero utilizadores, histórico vazio e ausência de pg_cron. Confirmar o trigger ativo `qa_auth_profile_created` → `public.qa_create_profile()` e rever os triggers existentes antes de criar contas. Confirmar que não contactam produção nem enviam emails.
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

A geração extrai das migrações os blocos de compras e papéis, subscrições, tentativas, eventos, antiabuso, domínios descartáveis, falhas de pagamento, recomputação do plano e RPCs Creem. Antes desses blocos, cria os enums de faturação com todos os valores, incluindo `packs` na definição inicial de `plan_type`. Mantém `profiles.current_plan` e `user_roles.role` como texto, preserva as constraints e políticas existentes, e reutiliza o trigger QA de criação de perfis. A recomputação grava o plano como texto e dispensa `profiles.updated_at`. Depois, protege o plano de alterações diretas por utilizadores autenticados, instala os triggers de subscrições e compras, ajusta os grants e restringe as duas tabelas de faturação ao modo sandbox. Não importa migrações de dunning, integrações Paddle, backfill de perfis, extensões de rede nem agendamentos. Em particular, as migrações `20261027150000_dunning_cron_schedule.sql` e `20261027220000_cron_secret.sql` contêm referências ao projeto de produção e ficam fora do bootstrap.

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

## Ciclo de vida após as quatro compras iniciais

O utilizador confirmou as quatro compras Creem Sandbox de **9 €, 7,20 €, 90 € e 72 €**, com entrega de webhook, associação da subscrição e acesso Pro nas quatro contas. Reutilizar essas subscrições para os testes seguintes.

| Cenário | Evidência local com Creem simulada | Creem Sandbox real |
| --- | --- | --- |
| Pagamento inicial | Fluxos mensal e anual exercitam o handler e a persistência de QA. | Quatro compras confirmadas pelo utilizador. |
| Renovação mensal e anual | Um evento pago prolonga o período em um mês ou um ano, respetivamente. O preço da renovação não é verificado pelo handler. | Pendente. Confirmar em EUR 9 € e 90 €, incluindo nas subscrições que usaram `PRODUCTHUNT20`. Guardar a transação e o período pago antes e depois. |
| Reentrega e ordem | A entrega duplicada mantém uma só subscrição. Um evento antigo não reativa uma subscrição expirada. | Pendente. Reentregar eventos a partir da Creem e verificar o estado e a contagem de registos. |
| Falha e recuperação | Pagamento inicial falhado mantém Free. `past_due` não prolonga o período nesta sequência. Um pagamento posterior recupera o estado ativo. | Pendente. Confirmar a falha numa renovação, o período pago inalterado e o prolongamento após recuperação. |
| Cancelamento | `scheduled_cancel` marca o fim do período. `canceled` remove a marca e o acesso mantém-se enquanto a data paga devolvida pela Creem estiver no futuro. | Pendente. Comparar cancelamento imediato e agendado e validar a data efetiva devolvida pela Creem em cada caso. |
| Expiração | O evento de expiração e o SQL de expiração foram exercitados localmente. | Pendente. Confirmar o perfil e uma chamada a uma funcionalidade Pro após o termo. No QA sem cron, usar o script manual quando necessário. |
| Reconciliação | O checkout pago sem entrega inicial pode ser recuperado. Um vínculo incorreto é recusado e a execução repetida não substitui um estado obtido de um webhook. | Pendente. Testar recuperação num caso controlado de webhook não processado. Reutilizar a evidência das compras iniciais sem as repetir. |

### Recuperar um webhook não processado

Primeiro, procurar a entrega na Creem e pedir reentrega do evento original. Confirmar uma resposta 2xx, o estado da subscrição e o plano efetivo. Para uma renovação em falta, comparar a transação e a nova data paga com o registo do QA. A reentrega do evento é o procedimento suportado para atualizar uma subscrição já vinculada.

Se o pagamento inicial estiver confirmado mas a entrega não estiver disponível, usar o ID do checkout já associado a uma tentativa no QA. O script consulta a Creem Sandbox, exige um checkout pago e valida a referência, o produto e a subscrição através da RPC existente. A rotina só aponta para o Supabase QA e a API Sandbox. Não recupera uma tentativa cujo vínculo de checkout nunca tenha sido gravado e não altera o estado registado por um webhook já aplicado.

Injetar `CREEM_API_KEY` da Sandbox e `SUPABASE_QA_SERVICE_ROLE_KEY` pelo mecanismo seguro da sessão. Com Node.js 24, executar da raiz do repositório:

```sh
CREEM_MODE=test NODE_USE_ENV_PROXY=1 node scripts/creem-qa/reconcile-checkout.mjs <checkout-id>
```

Uma resposta de sucesso da RPC também pode representar uma operação repetida. Confirmar sempre o vínculo, o estado da subscrição, a data paga e o perfil QA. Se não houver vínculo local ou não for possível reentregar uma renovação perdida, registar a divergência e manter a decisão de Live pendente até haver um procedimento de recuperação validado.

### Decisão de Live

- Confirmar os preços integrais de ambas as renovações com evidência da Creem.
- Demonstrar recuperação de falha de cobrança e de entrega, reentrega idempotente e manutenção do estado mais recente.
- Confirmar o comportamento efetivo de ambos os cancelamentos e a remoção do acesso na expiração. Verificar o agendamento separadamente antes de Live.
- Aprovar o procedimento operacional para a deteção e reconciliação de divergências. Obter aprovação explícita antes de qualquer alteração em produção ou ativação Live.

## Evidência real de Resend e cancelamento

O utilizador confirmou que scheduled_cancel conserva o período e Pro, enquanto canceled é apresentado pela Creem como revogação imediata. Confirmou também que Resend de subscription.paid cria aparentemente outro ID e timestamp e avança creem_event_at sem reverter o cancelamento.

O handler não aplica o estado comercial do payload reenviado. Consulta GET subscriptions e grava o estado atual devolvido pela Creem. Isso explica a preservação do cancelamento. creem_event_at guarda created_at da entrega recebida e serve de filtro de ordenação das tentativas processadas. Com esta evidência, não pode ser interpretado como a versão comercial da subscrição. Aumentar o marcador num Resend é comportamento atual, não evidência de uma nova cobrança.

Os testes passam agora um payload antigo ativo com novo ID e timestamp enquanto GET subscriptions devolve scheduled_cancel ou canceled. A correção converte canceled da Creem em expired internamente para revogar o acesso imediatamente, conservando a data paga. scheduled_cancel continua mapeado para active com cancel_at_period_end=true. Esta adaptação é exclusiva da integração Creem, incluindo a reconciliação manual.

A proteção atual depende da atualidade da resposta GET da Creem. Uma leitura desatualizada ou duas entregas concorrentes com leituras em instantes diferentes podem persistir um snapshot antigo, pois o timestamp da entrega não é uma versão comercial. Antes de Live, validar a consistência da API e preparar sincronização serializada por subscrição ou uma versão comercial documentada pelo fornecedor. Não substituir o marcador por outro timestamp presumido sem confirmar a semântica do fornecedor.

Falta recolher um payload e uma resposta GET redigidos dos dois cancelamentos, incluindo status, current_period_end_date e eventuais campos de término efetivo, para confirmar todos os campos reais. A evidência fornecida permite confirmar os estados e o efeito observado, mas não contém esses documentos completos. Renovação real, falha de cobrança, expiração e recuperação de primeira entrega continuam pendentes.

## Sincronização serializada para QA final

Aplicar no QA, uma única vez, o ficheiro completo `supabase/migrations/20261123160000_creem_serial_sync.sql`. Republicar depois apenas `creem-webhook` a partir deste branch, mantendo verify_jwt=false. Usar também a nova versão do script manual de reconciliação. Não repetir o bootstrap nem as quatro compras. Durante a transição, o handler anterior pode responder 503 até ser republicado; reentregar essas entregas após o deployment.

A leitura da API passa a ocorrer depois de adquirir um lease de 60 segundos por subscrição. A gravação valida e bloqueia a linha do lease na mesma transação que atualiza a subscrição e remove o lease. Um worker cujo lease expirou ou foi substituído não pode gravar. Falhas deixam o lease expirar e devolvem 503 para reentrega. A função antiga deixa de ser executável diretamente pelo service_role. creem_event_at passa a NULL nas sincronizações e deixa de ordenar estados. O ID e o timestamp de Resend não determinam o estado comercial.

A reconciliação usa o mesmo protocolo e pode agora atualizar uma subscrição já vinculada, incluindo uma renovação perdida. Consulta sempre a API atual. O protocolo impede snapshots obtidos por workers concorrentes de serem aplicados fora da ordem das leituras. Continua a depender de a API da Creem devolver o estado atual. Uma inconsistência interna do fornecedor requer reconsulta e reconciliação, não pode ser resolvida atribuindo uma versão ao timestamp de entrega.

QA final necessário: aplicar a migração, republicar o webhook, reentregar um evento conhecido e verificar scheduled_cancel/canceled com as subscrições existentes. Confirmar também que a recuperação manual funciona com credenciais QA. Monitorizar respostas não 2xx, leases expirados e diferenças entre estado Creem e plano QA. Operacionalmente, reentregar e reconciliar os casos divergentes até convergirem. Renovação e falhas podem ser exercitadas com fixtures automatizadas e ações sandbox disponíveis, acompanhadas por esta reconciliação. Esperar pelas datas naturais de dezembro de 2026 ou novembro de 2027 não é critério de aprovação.

Decisão de código: READY FOR FINAL QA após os testes automatizados. A aprovação Live depende da aplicação e validação desta versão no QA, da recuperação operacional demonstrada e de um responsável pelo acompanhamento das entregas e divergências. O deployment e a ativação em produção requerem aprovação explícita.
