# ONEHACK_REMIND send log, 1 Nov 2026 (Lisbon, WET)
- Authorization: Nuno, card t402s1560 ("Envia o lembrete OneHack hoje, assim que estiver pronto").
- campaign-admin v5 deployed (base = repo HEAD 03ea5fe with ACTIVATION1 template kept; prod was v4); local commit 9fb323c. Deployed files verified byte-for-byte.
- QA (nmourao+pfpqa1031@mail.grokbot.com), 13:27: both variants delivered, render OK, CTA -> /pricing?code=ONEHACK100&lang=en, landing logged, after login dialog "Code ONEHACK100 will be applied", Paddle "Due today €0.00, ONEHACK100 applied" (closed before paying; attempt abandoned; uses left still 27). Unsubscribe page worked (DB true), QA re-subscribed afterwards. Screenshots: qa/.
- Uses left re-read from Paddle at send time: 27 of 50.
- Sent: main 27/27, failed 10/10, 0 failed, 0 skipped. Resend monthly usage header 572.
- Resend events ~13:35 WET: main 26 delivered + 1 clicked, failed 10 delivered. Bounces 0, complaints 0, suppressed 0.
