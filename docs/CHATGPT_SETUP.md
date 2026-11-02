# Guia para continuar o trabalho sem o El Patron (ChatGPT ou outro agente)

## 1. Código
- Repositório: github.com/nmouraoumgc/promptforgepro-68741456, branch `sync/handoff-2026-11-01`. Tem todo o trabalho local até 1/11/2026 (70 commits à frente de `main`).
- NÃO fazer merge para `main` sem confirmar primeiro se a Vercel faz deploy automático a partir do Git.
- O dossier completo está em `docs/HANDOFF.md`.

## 2. Segredos: nomes e onde estão (os valores nunca vão para o Git nem para o chat)
**Frontend** (ficheiro `.env` local e Vercel > Project prj_43m5wJTOoAycMJ42UdmaIeYaV7ik > Settings > Environment Variables):
- VITE_SUPABASE_URL
- VITE_SUPABASE_PROJECT_ID
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_PAYMENTS_CLIENT_TOKEN (client token do Paddle)

**Edge Functions** (Supabase > projeto cwrxbxxfaemcvliasycz > Edge Functions > Secrets):
- SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY (automáticos)
- OPENAI_API_KEY, OPENROUTER_API_KEY, OPENROUTER_MODELS, GROQ_API_KEY, AI_MODEL e AI_REASONING_EFFORT
- PADDLE_WEBHOOK_SECRET, PAYMENTS_LIVE_WEBHOOK_SECRET e PADDLE_SANDBOX_API_KEY
- RESEND_API_KEY, RESEND_FROM e RESEND_REPLY_TO
- IP_HASH_SECRET

Para trabalhar localmente, cria o `.env` com os valores copiados destes painéis.

## 3. Acessos a ligar
- **Supabase:** criar um Personal Access Token (supabase.com > Account > Access Tokens) e usar a CLI: `supabase link --project-ref cwrxbxxfaemcvliasycz`, depois `supabase functions deploy <nome>`.
- **Vercel:** criar um token (vercel.com > Settings > Tokens). Deploy:
  1. `npm ci`
  2. `npm run build`
  3. `npx vercel deploy --prod --token ...`, a partir de um checkout ligado ao projeto.
- **Paddle:** Dashboard > Developer Tools > Authentication. Só leituras, exceto o que o Nuno aprovar.
- **Resend:** resend.com > API Keys, para ver as entregas e os bounces.
- **GitHub:** a conta nmouraoumgc.
- **NUNCA** mexer no projeto Supabase hkmxtamqvekycbbzoeaw (o antigo do Lovable).

## 4. Tarefas e como executá-las
1. **Piloto do email de ativação (terça, 3/11, às 14:00 de Lisboa)**
   - 100 linhas `pending` em `campaign_sends`, com campaign ACTIVATION1 e batch PILOT.
   - Envio: chamar a edge function `campaign-admin` (POST, autenticada com a service role) com o corpo `{"action":"send","campaign":"ACTIVATION1","batch":"PILOT","dry_run":false,"max":100}`.
   - Primeiro fazer um teste com `dry_run:true`.
   - Verificação: `select batch,status,count(*) from campaign_sends where campaign='ACTIVATION1' group by 1,2;`. O esperado é PILOT/sent = 100.
   - Só depois do OK do Nuno.
2. **Lembrete OneHack:** já enviado a 1/11 (37 de 37). Basta acompanhar os cliques e as conversões do ONEHACK100 no Paddle.
3. **Agradecimento ONEHACK100 (20/11):** preparar o rascunho e mostrar ao Nuno antes de enviar.
4. **campaign-admin:** a versão em produção é a v5 (commit 9fb323c). Qualquer deploy tem de partir desta versão.

## 5. Regras
- Nunca enviar emails a utilizadores sem OK do Nuno.
- Nunca mostrar segredos.
- Nos testes, usar só a conta QA nmourao+pfpqa1031@mail.grokbot.com. Essa caixa só é lida pelo Grok Bot, por isso, sem ele, usar outra conta de teste.
- Escrever em português europeu, sem travessões.
