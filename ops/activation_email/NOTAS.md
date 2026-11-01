# Email de ativação PromptForge Pro (piloto preparado, NÃO enviado)

Gerado a 1 nov 2026, 13:15 (hora de Lisboa, WET); atualizado 13:40. Só 1 email de teste para a caixa QA. 100 linhas pending em campaign_sends (ACTIVATION1/PILOT) à espera do envio aprovado para 3 nov 14:00.

## Ficheiros
- activation_en.html / activation_en.txt: versão EN (principal)
- activation_pt.html / activation_pt.txt: versão PT-PT
- activation_*_preview.html, preview_en.png, preview_pt_mobile.png: pré-visualizações
- segment_activation.csv (chmod 600): 1021 destinatários propostos (id, email, first_name, canal, data de registo)
- segment.py / build.py: scripts que geraram o segmento e os templates (build.py também gera ../app/supabase/functions/_shared/campaignActivation.ts)
- pilot_100.csv, insert_pilot_100.sql (chmod 600): piloto de 100

Placeholders: {{SEND_ID}} (id da linha em campaign_sends, para o tracking c=ACTIVATION1&r=) e {{UNSUBSCRIBE_URL}} (https://promptforgepro.me/unsubscribe?t=<token>), iguais ao fluxo do campaign-admin.

## Segmento (1021)
1340 contas em auth.users. Excluídas: 279 suspeitas de fraude (relatório fake_accounts de 30/10), 23 Pro/pagas (plano, subscrição ativa ou override), 7 email não confirmado, 5 contas próprias/QA (inclui nmourao+pfpqa1031@mail.grokbot.com), 4 free que já executaram, 1 admin. Unsubscribes: 0.
Dentro dos 1021: 250 receberam WELCOME100 a 30/10, 188 receberam early access a 27-28/10, 35 vieram da OneHack, 984 registaram-se em abr/mai (onda de 26-28 abr), 43 em out/nov.

## Deep link (implementado e em produção a 1 nov 2026)
/create?mode=optimize aceita ?prompt= (máx. 2000 caracteres, texto simples, só preenche a caixa, nunca executa sozinho, ganha ao rascunho guardado como o prefill do Learn e passa a ser o rascunho, é removido do URL com history replace, sobrevive ao login via ?redirect=). Commit 03ea5fe, deploy Vercel dpl_A6YpwiUVMHeSMHrX26QfHPUWn1Mb (READY, promptforgepro.me). Testes: e2e/prompt_prefill.js 23/23 local e 23/23 em produção (backend simulado, utilizador falso qa.mock@example.com) + teste real com a conta QA (sem sessão, login, volta com a caixa preenchida, nada executado).

CTA EN: https://promptforgepro.me/create?mode=optimize&lang=en&prompt=Write%20a%20short%20email%20to%20a%20client%20asking%20them%20to%20pay%20an%20overdue%20invoice.%20Keep%20it%20polite.&c=ACTIVATION1&r={{SEND_ID}}
CTA PT (rascunho, não usado no piloto): mesmo formato com lang=pt e o prompt PT.
Assunto: "Your first optimised prompt takes 60 seconds" (assunto A). Passo 2 já não pede para colar.
Remetente (campaign-admin, constante FROM): PromptForge Pro <noreply@promptforgepro.me> (noreply, sem hífen), reply-to geral@promptforgepro.me.

## campaign-admin
Template ACTIVATION1 (EN) em supabase/functions/_shared/campaignActivation.ts, gerado por build.py a partir de activation_en.html/.txt. Campanha campaign='ACTIVATION1' (link c=ACTIVATION1&r=<campaign_sends.id>), lotes TEST e PILOT. Igual a A1/WELCOME100: token de unsubscribe por utilizador, List-Unsubscribe + One-Click, idempotency key, dedupe por UNIQUE(campaign,user_id) e claim pending->sending. Extra: antes de cada envio volta a verificar Free, 0 execuções, sem subscrição ativa nem override (senão fica pending e conta como skipped_ineligible).
Deployed: versão 5 da função (inclui também ONEHACK_REMIND, do outro worker, commit 9fb323c). Fonte deployed = repo HEAD.
Teste: 1 envio para nmourao+pfpqa1031@mail.grokbot.com (lote TEST) a 1 nov 13:33 (Lisboa, WET), entregue; link do botão redireciona (Resend click tracking) para o URL certo com r=<id da linha TEST>, landing registada.

## Piloto (100)
pilot_100.csv (chmod 600): 100 de segment_activation.csv, excluídos os 250 do WELCOME100 (30/10) e os 37 de ../onehack_reminder/segment_onehack_reminder.csv (35 sobrepostos com o segmento). Pool 736, todos re-verificados no Supabase a 1 nov 13:31 (confirmado, Free, 0 execuções, sem subscrição/override, sem unsubscribe, não admin, sem envios welcome100/ACTIVATION1/ONEHACK_REMIND). Escolha: random.Random(20261103).sample(elegíveis ordenados por id, 100).
Já inseridos em campaign_sends como pending (campaign='ACTIVATION1', batch='PILOT', 100 linhas, insert_pilot_100.sql). Dry run a 1 nov: attempted 100, sent 0, skipped 0.

## ENVIO (terça 3 nov 2026, 14:00 Lisboa, WET = 14:00 UTC). Um único passo:
Opcional 1 min antes, dry run (não envia nada; deve dar attempted 100):
  mesma chamada abaixo com "dry_run":true

Comando de envio (Supabase MCP execute_sql, projeto cwrxbxxfaemcvliasycz):
```sql
select net.http_post(
  url := 'https://cwrxbxxfaemcvliasycz.supabase.co/functions/v1/campaign-admin',
  headers := jsonb_build_object('Content-Type','application/json',
    'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='dunning_cron_key'),
    'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
  body := '{"action":"send","campaign":"ACTIVATION1","batch":"PILOT","dry_run":false,"max":100}'::jsonb,
  timeout_milliseconds := 150000) as request_id;
```
Resultado: `select status_code, content from net._http_response where id = <request_id>;` (sent, failed, skipped_*, stopped, quota). Se parar por 429 ou timeout, repetir o mesmo comando: só envia as linhas ainda pending, nunca duplica.

Verificação:
```sql
select batch, status, count(*) from campaign_sends where campaign='ACTIVATION1' group by 1,2 order by 1,2;
-- esperado depois do envio: PILOT/sent = 100 (ou sent + failed + pending = 100), TEST/sent = 1
select count(*) from campaign_sends where campaign='ACTIVATION1' and batch='PILOT' and status='sent';
```
Entregas/bounces (uns minutos depois): action "events" com {"campaign":"ACTIVATION1","batch":"PILOT"}, mesma chamada.
Cancelar o piloto antes do envio: `delete from campaign_sends where campaign='ACTIVATION1' and batch='PILOT' and status='pending';`
