# Toasts: fecho automático global

Base: main e4a4be910d7a66792955363b5869179e16fa07fc.
Branch: fix/toasts-auto-dismiss. Data: 2/11/2026, Europe/Lisbon.

## Alteração

Política comum: sucesso/informação/avisos 4000 ms, erros 6000 ms. Aplicada globalmente a Radix e Sonner; as chamadas não definem tempos. Os três consumidores diretos de Sonner passam pelo adaptador central. Durações fornecidas por chamadas, incluindo Infinity, não anulam os prazos. O X permanece disponível; o Radix recebe nome acessível Fechar aviso e o Sonner tem closeButton global.

Os temporizadores centrais também fecham os avisos quando a biblioteca pausa o seu temporizador por foco/hover. Toasts fechados no store Radix são removidos após 1 segundo para permitir a animação de saída. Atualização, substituição e fecho manual cancelam os temporizadores anteriores.

Sem alterações a migrações, edge functions, emails ou Paddle. Sem novas dependências.

## Testes locais

14 testes UI passaram: 7 existentes e 7 específicos de toasts. Tipos, lint dos componentes alterados e build passaram. A auditoria da árvore src não encontrou chamadas de toast com duração infinita nem importações diretas que evitem o adaptador central. A repetição infinita existente numa animação de ícone não é um toast.

## Testes no browser, exclusivamente QA

Preview: https://promptforgepro-bafmwltn9-nuno-mouraos-projects.vercel.app/login
Deployment de preview: dpl_3t7rjQNfxxDjp52Ksud1mTdKXja5.
A instrumentação apenas observa o DOM e mostra tipo/tempos; não lê nem regista credenciais, tokens ou conteúdo dos prompts. Não integra o payload de produção.

- Login correto: sessão QA confirmada no menu; toast Radix fechou em 3981 ms.
- Erro geral Radix: fechou em 5998 ms.
- Erro Sonner: fechou em 5944 ms.
- Informação Radix: fechou em 4000 ms.
- X Radix ativado pelo teclado: fechou antecipadamente em 23 ms.
- Login errado: PASSOU na repetição expressamente pedida pelo Nuno. O aviso de erro Radix fechou em 5999 ms; a página permaneceu no login e nenhum toast ficou aberto.

O primeiro formulário previsto para erro recebeu credenciais corretas e serviu como teste de sucesso. Após terminar a sessão QA, um pedido seguro foi recusado; não foi repetido até o Nuno pedir expressamente para tentar de novo. A repetição autorizada confirmou o cenário incorreto sem ler ou registar credenciais.

## Estado de publicação

Os três cenários pedidos estão validados. O Nuno autorizou publicar somente o frontend se passassem. O resultado da publicação é registado no relatório final da sessão.

O payload de produção não inclui qa-toast-probe.ts nem o script de medição. Não aplicar migrações, republicar edge functions, enviar emails ou escrever no Paddle.
