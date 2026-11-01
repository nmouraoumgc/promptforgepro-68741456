# Dossier de passagem: El Patron (agente principal do Nuno Mourão)
Data: 1/11/2026, 13:33 (hora de Lisboa)

## 1. Como trabalhar com o Nuno
- Responder em português europeu, de forma curta, direta e estruturada. Propor alternativas e assinalar riscos.
- NUNCA usar o travessão (—). Usar vírgulas, dois pontos ou pontos finais.
- Ele não gosta de tom condescendente nem de perguntas desnecessárias. Tem atenção aos custos.
- Fuso horário: Europe/Lisbon.

## 2. Regras de segurança (obrigatórias)
- NUNCA mexer no projeto antigo do Lovable: Supabase hkmxtamqvekycbbzoeaw.
- Nunca imprimir, ecoar nem registar em logs o valor de segredos.
- Nunca enviar emails a utilizadores sem o OK do Nuno.
- Posts e mensagens saem em nome do Nuno: mostrar sempre o rascunho e esperar pelo OK dele.
- Paddle: só leituras (GET), exceto escritas que ele tenha aprovado.
- Não apagar contas nem cancelar subscrições Paddle sem OK explícito.
- Construtor eGO: não guardar nem publicar nada sem OK.
- Testes: usar SÓ a conta de QA nmourao+pfpqa1031@mail.grokbot.com. A password está em /tmp/qa/pf.pw (não imprimir). Nunca usar o email pessoal do Nuno.

## 3. PromptForgePro (https://promptforgepro.me)
- Vercel: projeto prj_43m5wJTOoAycMJ42UdmaIeYaV7ik, equipa team_c1h9Lh2e2QSW5Zp0sHsAAWmT, através do conector Vercel.
- Supabase: projeto cwrxbxxfaemcvliasycz, através do conector user-Supabase--github.
- Repositório: /workspace/pfp/app, branch main. Os commits são feitos como "Grok Bot" e não são enviados para o remoto (não há push).
- Deploy:
  1. npm run build
  2. repor dist/vercel.json
  3. upload_file
  4. create_deployment (conector Vercel)
- Paddle:
  - Pro mensal: €9.
  - Pro anual: €90/ano, preço pri_01m67br0e15t23kqzaa4m3qa78, mapeado para pro_annual.
  - Prompt Packs: €19, pagamento único (plano `packs`).
  - `showAddTaxId: false` em todo o lado.
  - Contacto do Paddle Retain: Eric, a configurar Term Optimization.
- Código ONEHACK100 (dsc_01m63wcnrqefjr1v8dx98vtgsn):
  - Dá 1 mês de Pro grátis e só funciona através de /pricing?code=ONEHACK100.
  - Restam 27 de 50 utilizações. Expira a 28/11 às 13:00 (Lisboa).
- Conta do Nuno: Pro de cortesia, através da tabela plan_overrides.
- Limites do Pro: 100 execuções por dia e 3 perfis de marca.
- Edge function campaign-admin:
  - Gere templates, tokens e cabeçalhos de unsubscribe.
  - A tabela campaign_sends evita envios duplicados.
  - O tracking usa c= e r={{SEND_ID}}.

Deploys recentes (todos READY):
| Alteração | Deploy | Commit |
|---|---|---|
| Correção do Paddle | dpl_GhkGJTUhk3XeP4Ree9YpmjZLoBRC | 31dd414 |
| Fluxo UX em 3 passos e autosave de 24h | dpl_4mkssJkV1bQ3b7PMyoKnbTod8FKk | 0ce0af4 |
| Botões em mobile e plano Pro/Free a alternar no ecrã | dpl_FKvKECH7vmvUH1xDPyfbyDfGPrEN | 6a62ca2 |

Números a 1/11 às 13:00 (Lisboa):
- 1339 registos.
- 24 contas Pro: 22 pagas pelo Paddle e 2 de cortesia.
- 4 Pro novos, todos com o ONEHACK100.
- 6 cancelamentos, mais 2 marcados para cancelar no fim do período.

## 4. Trabalho em curso
1. Lembrete OneHack (ONEHACK_REMIND)
   - Pasta: /workspace/pfp/onehack_reminder. Seguir o RUNBOOK.md em campaign_admin_prep/.
   - Destinatários: 37 pessoas, 27 no lote "main" e 10 no lote "failed" (cartão recusado).
   - Os testes ONEHACK_REMIND_QA1 e QA2 chegaram à conta de QA e estão corretos.
   - O Nuno APROVOU o envio para hoje (cartão t402s1560).
   - Falta confirmar:
     - se os 37 envios foram feitos (ver a tabela campaign_sends, campaign='ONEHACK_REMIND') e se houve bounces;
     - se o "27 of 50" está a ser calculado com dados reais e não fixo no template;
     - corrigir "&rarr;" na versão de texto do email "failed".
2. Email de ativação (piloto de 100)
   - Pasta: /workspace/pfp/activation_email. O plano está em NOTAS.md.
   - Lista: pilot_100.csv, excluindo os 37 do OneHack e quem já recebeu o WELCOME100.
   - Tarefas: link com ?prompt= já preenchido e template 'activation' na campaign-admin.
   - A rotina "PFP: piloto email de ativação (100)" envia na terça, 3/11, às 14:00. Confirmar antes que o deploy e o QA estão feitos.
   - Atenção: dois trabalhos alteraram a campaign-admin. Antes de cada deploy, ir buscar o código que está em produção e juntar as alterações.
3. A rotina "PFP: email de agradecimento ONEHACK100" corre a 20/11 às 9:00.
4. A rotina "Ler emails nmourao@mail.grokbot.com" resume o email que chega a essa caixa.

## 5. OneHack
- Tópico: https://onehack.st/t/promptforge-pro-one-free-month-of-pro-and-every-prompt-scored-before-you-send-it/326873
- A conta Nuno_Mourao tem sessão iniciada no browser da box.
- Respondi hoje à Grace2077 (post 9), com o texto aprovado pelo Nuno.
- Promessa pública: um lembrete "last used" para prompts antigos, que ainda não existe. Falta perguntar ao Nuno se entra na lista de tarefas.

## 6. À espera de decisão do Nuno
- Terminar a sessão headless que o smoke test de 31/10 deixou aberta na conta dele.
- Desligar o click tracking do Resend nos emails de autenticação.
- Dar o 1.º mês de Pro sem cartão a quem usa códigos de 100%. Contexto: o Paddle recusa muitas vezes a validação de €0.
- Uma opção de "compra empresarial", porque já não é possível indicar NIF/VAT no checkout.
- Assuntos antigos: o texto tu/palavra-passe, o GRACEPRO e as 282 contas falsas.

## 7. Outros projetos (contexto)
- Loja All For You (allforyou.beauty): cosmética de luxo, com equipa de bots própria (Shopify Design, etc.). Contacto: geral@allforyou.beauty.
- #SpacesSporting: X Spaces sobre o Sporting.
- Comentário na Rádio Observador.
- Quaresma Heritage.
- In Loco Investments (imobiliário).
- Terrenos em Paderne.

## 8. Acessos (sem segredos)
- Conectores ligados:
  - Vercel, Supabase, Resend, PostHog, Gmail (várias contas), Outlook, Google Drive, Docs e Calendar, X, Shopify, Notion, GitHub e Sentry.
- Browser da box: sessões iniciadas no OneHack e noutros sites.
- Ficheiros sensíveis:
  - /workspace/agent-tools/8a9d753b-*.txt: exportação de utilizadores com emails (chmod 600), pode ser apagado.
  - /tmp/qa/pf.pw: password da conta de QA.

## ATUALIZAÇÃO 1/11, 13:35 (Lisboa)
- Lembrete OneHack ENVIADO: 37 de 37 (27 principal e 10 de checkout falhado). Zero bounces. Registo completo em /workspace/pfp/onehack_reminder/SEND_LOG.md.
- campaign-admin está em produção na v5 (commit local 9fb323c), que inclui ONEHACK_REMIND e ACTIVATION1. Qualquer deploy futuro tem de partir da v5. Partir do 03ea5fe remove o ONEHACK_REMIND.
- 35 destes 37 também estão no segmento de ativação. É preciso garantir que ficam fora do piloto de 3/11.
- Piloto de ativação PRONTO. O deploy dpl_A6YpwiUVMHeSMHrX26QfHPUWn1Mb está READY. Os 37 do OneHack e os 250 do WELCOME100 já estão excluídos. Há 100 linhas `pending` em campaign_sends (ACTIVATION1/PILOT). O comando de envio está em /workspace/pfp/activation_email/NOTAS.md, secção "ENVIO", para terça 3/11 às 14:00 (rotina). Depois do envio, o esperado na query de verificação é PILOT/sent = 100.
