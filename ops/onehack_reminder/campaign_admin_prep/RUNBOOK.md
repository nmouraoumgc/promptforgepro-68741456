# ONEHACK_REMIND: passos pendentes (NADA executado: sem deploy, sem inserts, sem envios)
Base: campaign-admin v4 deployado (updated 30 out 13:18 WET), igual ao repo; sem template 'activation' presente às 13:23 WET de 1 nov.
Ficheiros: index.ts (patch), campaignOnehackRemind.ts (novo _shared), deployed_v4_* (cópia exata do deploy). deno check OK; render = rascunhos aprovados (byte a byte).
1. Re-fetch get_edge_function campaign-admin; se a versão != 4, fazer merge (manter activation e outros) antes do deploy.
2. Deploy: index.ts + _shared/{paddle,campaignA1,campaignWelcome100,internalAuth,campaignOnehackRemind}.ts (verify_jwt true).
3. QA: inserir 2 linhas pending para nmourao+pfpqa1031@mail.grokbot.com (campaign ONEHACK_REMIND_QA1 batch main; ONEHACK_REMIND_QA2 batch failed); send dry_run=false max=1 em cada; verificar render, CTA (/pricing com ONEHACK100 e 0,00 € a pagar, parar antes de pagar), unsubscribe.
4. Só se o QA passar: executar ../insert_onehack_remind.sql (re-verifica cada destinatário), depois send campaign ONEHACK_REMIND batch main (27) e batch failed (10), dry_run=false. usesLeft é relido da Paddle em cada chamada; o envio pára se não houver códigos.
5. status + events (Resend) após uns minutos.
