# PromptForge Pro — Auditoria e plano de implementação (Superpowers)

Data: 2026-11-12  
Branch de trabalho: `docs/superpowers-audit-plan-20261112`  
Estado: auditoria inicial, sem alterações funcionais.

## Método e limites

Aplicar ciclo **reproduzir → hipótese → teste que falha → correção mínima → teste que passa → revisão → preview → aprovação**. O plugin Superpowers está instalado, mas as suas ações não foram expostas nesta sessão; o plano segue a metodologia sem alegar execução do plugin.

Fontes inspecionadas: páginas públicas `/`, `/pricing`, `/pricing?lang=en`, `/learn`; código `src/App.tsx`, `src/pages/Pricing.tsx`, `src/pages/Learn.tsx`, `src/data/learnDb.ts`, `src/components/InstallAppReminder.tsx`, `src/lib/pageMeta.tsx`, `vercel.json`, `package.json`.

Não inspecionados nesta ronda: sessões autenticadas, métricas reais de conversão, pagamentos reais, logs privados, cobertura E2E móvel.

## Diagnóstico e backlog ordenado

### P0 — Fiabilidade do catálogo Aprender (investigação, não falha confirmada)

**Evidência:** a extração pública de `/learn` mostra contadores `Fundamentos 0 / Por setor 0 / Avançado 0` apesar do texto prometer 4 lições gratuitas. Em `src/data/learnDb.ts`, `useLessons` consulta `learn_lessons` e devolve `error`; `src/pages/Learn.tsx` recebe `lessons, isLoading`, sem evidência de tratamento de erro no trecho examinado. Pode ser uma limitação do navegador/extrator ou um problema real de carregamento; não assumir causa.

**Testes antes de alterar:**
1. Navegador real anónimo, PT/EN, aguardar hidratação; confirmar 4 lições gratuitas e contadores.
2. Intercetar erro da consulta `learn_lessons` e verificar se aparece estado de erro recuperável, nunca catálogo vazio silencioso.
3. Repetir com rede lenta/offline e recuperação.
4. Garantir que nenhuma lição Pro revela corpo sem entitlement.

**Implementação proposta:** acrescentar estado de erro localizado e botão `Tentar novamente` com `refetch` em `useLessons`; só após identificar a causa de eventuais erros de rede/RLS. Não modificar políticas de acesso nem dados sem diagnóstico.

**Aceitação:** anónimo vê as 4 lições gratuitas; falha de API apresenta erro e retry; conteúdo Pro permanece protegido.

### P1 — Percurso comercial e conversão

**Evidência:** homepage inclui CTA `Começar grátis` e `Ver planos`; pricing apresenta tabela clara PT/EN e três CTAs. A homepage volta a detalhar limites que já aparecem na página de preços, aumentando carga cognitiva. Não há prova, nesta auditoria, de eventos de funil ou taxa de conversão.

**Testes:** snapshots/semântica PT/EN em desktop e mobile; alternância mensal/anual sincroniza preço na tabela e no cartão; CTA Free abre signup; Packs e Pro seguem fluxo de checkout apenas em ambiente de testes sem compra real; foco e teclado.

**Implementação proposta:** na homepage reduzir repetição dos limites a um resumo e link para pricing; manter preços e condições essenciais. Instrumentar eventos de funil sem PII: `pricing_view`, `billing_period_change`, `plan_cta_click`, `signup_start`, `signup_complete`; verificar consentimento e configuração existente antes de acrescentar analytics.

**Aceitação:** nenhum texto contraditório PT/EN, CTAs funcionais, eventos sem dados pessoais, checkout inalterado.

### P1 — Testes de regressão e CI

**Evidência:** `package.json` tem scripts `test:p0`, `test:p1`, `test:toasts`, `test:override-cron`, mas não um script E2E de navegador para os fluxos comerciais públicos. Build bem-sucedido não prova navegação e interação.

**Implementação proposta:** testes de integração React para tabela de preços e erro/retry das lições; smoke tests Playwright ou browser automation em preview para `/`, `/pricing`, `/learn`, `/signup` em PT/EN, mobile/desktop. Executar lint/test/build em PR antes do merge.

**Aceitação:** testes determinísticos, sem credenciais de produção nem compras reais; falhas bloqueiam merge.

### P2 — Instalação PWA e acessibilidade

**Evidência:** `InstallAppReminder.tsx` mostra CTA após 12 segundos, guarda dismiss por 30 dias e usa `beforeinstallprompt`; há instruções manuais para iOS/outros. Ainda não há evidência de QA real por dispositivo ou medição de instalação.

**Testes:** iOS Safari, Android Chrome e desktop; standalone não mostra lembrete; dismiss mantém cooldown; CTA não cobre controles críticos; leitor de ecrã e navegação por teclado.

**Implementação proposta:** tornar o lembrete contextual (após interação significativa, não durante primeiro acesso ao pricing); manter fallback manual e controlo de frequência; instrumentar visualização/dispensa/instalação sem PII.

**Aceitação:** sem pop-up intrusivo nem falsos sucessos de instalação.

### P2 — SEO e performance

**Evidência:** metadados PT/EN e sitemap bilingue já implementados; `vercel.json` inclui rotas pré-renderizadas de lições gratuitas. Build Vite anterior reportou chunks grandes e aviso de base Browserslist desatualizada (não é falha de compilação).

**Testes:** verificar canonicals/hreflang, 200 para sitemap, meta de rotas públicas, métricas Core Web Vitals em mobile e comparação antes/depois.

**Implementação proposta:** analisar bundles com ferramenta de visualização, lazy-load dos módulos de maior peso; evitar otimização sem medições.

**Aceitação:** sem regressão de navegação, melhoria mensurável de LCP/INP/CLS quando disponíveis.

## Ordem de execução sugerida

1. **Bloco A (P0):** reproduzir o estado de Aprender e escrever testes; corrigir apenas se reproduzido.
2. **Bloco B (P1):** testes PT/EN de pricing/signup, acessibilidade e eventos de funil.
3. **Bloco C (P1):** simplificar homepage e preparar experiência de conversão com métricas.
4. **Bloco D (P2):** PWA, performance e SEO residual.

## Regras de entrega

- Branch por bloco, PR em draft, alterações pequenas e reversíveis.
- TDD quando apropriado; registar testes passados, falhados e não executados.
- QA em preview e conta de testes dedicada.
- **Não fazer merge para main nem deploy em produção sem autorização.**
- Não enviar emails, não alterar Paddle nem projeto Lovable sem autorização específica.
- Não expor segredos; não alterar dados de produção.
