# P0/P1: validação QA e bloqueio de publicação

Data: 2/11/2026, Europe/Lisbon. Base aprovada: release/p0-p1, 6fdd9ba.

## Estado da publicação

A migração P0 e as quatro edge functions v18 foram publicadas e verificadas. O frontend permanece na versão anterior. Campaign-admin, auth-send-email e Paddle não foram alterados nesta validação. Nenhum email foi enviado.

Antes da migração, sete tabelas foram exportadas para ficheiros privados fora do repositório. Não se trata de um backup completo do Supabase/Auth. O SQL de rollback está preparado e não foi executado.

## Provas HTTP e contadores

- QA Free: test-prompts 403; quarta otimização do mesmo texto 429; input acima de 20 mil caracteres 400. Contadores mantiveram-se em 3, sem reservas pendentes.
- Override QA Pro autorizado por 600 segundos, de 16:28:40.151111 a 16:38:40.151111, sem Paddle.
- QA Pro: test-prompts 200. Seis otimizações adicionais do mesmo texto 200, com limites por prompt e dia nulos; a sétima devolveu 429 e o teste interrompeu-se. Contadores 9, sem reservas pendentes. Pelo caminho do código e o override ainda ativo, a origem provável é o rate limit do fornecedor; o corpo desse erro não foi guardado pelo verificador inicial. Não afirmar que foi provada a passagem do teto diário em produção. O cenário de 21 sucessos permanece coberto offline.
- A consulta de logs não é usada como prova nesta ronda.

## Expiração: regressão encontrada

O trigger existente trg_sync_plan_from_override chama recompute_profile_plan e copia o plano efetivo para profiles.current_plan. O decorrer do tempo não dispara esse trigger. O helper publicado continua a aceitar profiles.current_plan='pro' mesmo quando o override expirou. Uma regressão local reproduziu o erro: perfil Pro com override Pro expirado continuou premium.

A verificação real depois das 16:38:40 e a reposição estritamente da QA são registadas no relatório final. Não considerar a expiração automática aprovada sem observar a perda de direitos.

## Patch de revisão, sem deploy

Branch local fix/expired-override-entitlements, a partir de 6fdd9ba.

- Quando existe override expirado, o helper revalida direitos pagos em subscriptions e purchases, em vez de considerar o perfil em cache como concessão permanente. Mantém subscrições válidas, Premium legado comprado, Packs e Admin. Fontes indisponíveis devolvem 503.
- O SQL da quota continua sem decidir direitos e recebe auth.isPremium resolvido no servidor.
- O HTTP 429 do fornecedor recebe código AI_RATE_LIMIT, distinto de OPTIMIZATION_LIMIT e OPTIMIZATION_DAILY_LIMIT.
- 15 grupos backend/SQL e 7 testes UI passaram; tipos e lint passaram. Inclui regressões de perfil desatualizado, direitos pagos preservados e falha do fornecedor sem débito.

Este patch protege os endpoints que usam o helper, mas não altera sozinho o cache do perfil, o frontend ou as políticas antigas que leem current_plan diretamente. A atualização automática desse cache e a revisão desses consumidores precisam de uma solução adicional revista antes da publicação. Não foi criado cron, nem aplicada nova migração ou configuração para isso. Não publicar apenas este patch como se resolvesse a expiração global.

## Resultado real da expiração e limpeza QA

Às 16:39:28, o override já estava expirado e inativo, mas profiles.current_plan continuava Pro. Depois da expiração, test-prompts devolveu HTTP 200 em vez de 403. Falha confirmada, sem dependência dos logs. Nenhum frontend foi publicado.

Às 16:39:50, a QA foi reposta em Free através da função existente recompute_profile_plan, limitada à conta QA e ao override criado nesta sessão, já expirado. O registo expirado foi mantido para auditoria. Contadores: 9 sucessos por prompt e no dia, 0 reservas pendentes. Esta reposição foi manual e NÃO prova expiração automática correta.

Foi exportada adicionalmente purchases, identificada como fonte do trigger antigo, às 16:37:25: 0 linhas, ficheiro purchases.json com 3 bytes, na mesma pasta privada. Esta exportação adicional é posterior à migração P0, que não altera purchases; as sete exportações originais são anteriores à migração.

Depois da reposição manual, às 16:40:55, os testes HTTP Free passaram novamente: test-prompts 403, otimização bloqueada 429, input inválido 400. Contadores mantidos em 9 por prompt/dia e 0 reservas pendentes.

## Atualização pedida: limpeza horária, apenas preparada

Em 2/11/2026, Nuno pediu para juntar uma migração aditiva com pg_cron horário ao branch fix/expired-override-entitlements e fazer primeiro uma contagem em produção. Não autorizou a aplicação em produção.

Dry-run executado em cwrxbxxfaemcvliasycz às 17:03:04.203702 de Lisboa: **0 perfis candidatos**. Só foram devolvidos timestamp e contagem, sem emails ou IDs. A contagem representa perfis a recalcular, não necessariamente contas a passar a Free: a função existente preserva direitos pagos válidos.

```sql
select now() as checked_at, count(*) as affected_profiles
from public.profiles p
where p.current_plan in ('pro'::public.plan_type, 'premium'::public.plan_type, 'packs'::public.plan_type)
  and exists (
    select 1 from public.plan_overrides o
    where o.user_id = p.id
      and o.expires_at is not null
      and o.expires_at <= now()
  );
```

Pré-verificação de leitura: pg_cron instalado, recompute_profile_plan(uuid) existente e 0 jobs com o nome novo.

Migração criada com Supabase CLI: `20261102170544_expired_override_hourly_recompute.sql`. Acrescenta exclusivamente o job `recompute-expired-overrides-hourly`, com horário `0 * * * *`, chamando public.recompute_profile_plan para cada perfil pago com override expirado. Usa bloqueios de perfil por ordem estável e uma transação por execução. Não modifica a função existente, permissões, overrides ou outros jobs; não executa a limpeza ao instalar a migração. Se o nome já existir, a migração falha para revisão, sem substituir o job anterior.

Frequência horária implica até cerca de uma hora de atraso no perfil persistido, além de eventual atraso do worker e atualização do cliente. A correção do helper incluída no branch evita confiar no cache expirado nos endpoints que forem republicados com ela; o job atualiza o perfil usado pelos outros consumidores. Não apresentar a limpeza horária como expiração imediata em todas as políticas antigas.

Testes locais do cron: PGlite executa o SQL real do job e a função recompute existente; apenas o registo cron.schedule é simulado, pois não existe worker pg_cron nesse ambiente. Cobertos seleção igual ao dry-run, não execução durante a migração, preservação de subscrições/compras e overrides ativos/permanentes, execução repetida, recusa de nome duplicado e reversão integral em caso de falha. O agendamento real só poderá ser validado depois de aplicação aprovada.

Após novo OK, aplicar apenas esta migração, sem db push; confirmar cron.job e a primeira execução em cron.job_run_details. Não executar o comando abaixo sem aprovação de rollback: remove somente o job novo, sem desfazer planos legitimamente recalculados.

```sql
select cron.unschedule('recompute-expired-overrides-hourly');
```

Nenhum job foi criado em produção, nem ocorreu deploy, email ou escrita Paddle nesta preparação. O frontend continua por publicar.
