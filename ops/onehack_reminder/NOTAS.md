# Lembrete ONEHACK100 (RASCUNHO, nada enviado)
Gerado a 1 nov 2026 (hora de Lisboa, WET). Só leituras: SQL SELECT no Supabase cwrxbxxfaemcvliasycz, GET na API Paddle. Nenhum template, audiência, broadcast ou linha em campaign_sends criado.

Ficheiros: reminder_{en,pt}_{main,failed}.html/.txt, *_preview.html, preview_*.png, segment_onehack_reminder.csv (600), excluded.csv (600),
overlap_activation_ids.txt, segment.py, build.py, paddle_onehack100_live.json, paddle_onehack100_txns.json (600), raw_candidates.json (600).

Segmento: 61 candidatos (49 backfill_discount, 11 referrer, 1 sem canal com tentativa ONEHACK100 após o post).
Excluídos: 22 já concluíram ONEHACK100 (todos Pro; 17 dos 49 backfill), 2 do relatório fake_accounts 30/10. 0 não confirmados, 0 unsubscribes, 0 contas próprias/admin.
Enviar: 37 = 27 variante principal + 10 variante "algo correu mal" (8 recusa do banco, 4 3DS, 2 too_many_attempts; um utilizador pode ter vários).
Sobreposição: 35 dos 37 estão no segmento de ativação (activation_email/segment_activation.csv). pilot_100.csv não existe.

Placeholders: {{SEND_ID}} (campaign_sends.id com campaign ou batch = 'ONEHACK_REMIND', senão log_campaign_landing não regista), {{UNSUBSCRIBE_URL}}, {{USES_LEFT}} (reler Paddle antes de enviar; 27 a 1 nov).
