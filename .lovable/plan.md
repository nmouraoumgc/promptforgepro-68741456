# Plano: Trial €2/7 dias com conversão automática + Anti-fraude + Dunning

## Parte 1 — Estrutura do trial (€2 → conversão automática 9€/mês)

A chave: usar **um único checkout de subscrição com cobrança imediata de €2 + período de trial de 7 dias antes da cobrança recorrente começar**. O cartão fica guardado no Paddle desde o segundo zero. Ao fim dos 7 dias, o Paddle cobra automaticamente os 9€/mês — sem necessidade de o cliente fazer nada.

### Implementação técnica
Paddle não tem "paid trial" nativo num único preço, mas **suporta dois items no mesmo checkout que partilham o mesmo método de pagamento e customer**:

1. **Item 1 — One-time**: novo preço `pro_trial_access_7d` (€2, sem recorrência)
2. **Item 2 — Subscrição**: novo preço `pro_monthly_trial_7d` (9€/mês com `trial_period: { interval: 'day', frequency: 7 }`)

Resultado para o cliente:
- Paga €2 imediatamente (cobrança real, valida cartão)
- Subscrição criada em status `trialing` por 7 dias
- Dia 8: Paddle cobra automaticamente 9€ no mesmo cartão (conversão automática)
- Depois cobra 9€ todos os meses até cancelar

O DB trigger `sync_profile_plan_from_subscription` já trata o status `trialing` como Pro (linha 73 da função), portanto o utilizador tem acesso Pro imediato e contínuo.

### Ficheiros
- Criar 2 novos preços via tool `create_price` (no produto `pro_plan` existente)
- `src/pages/Pricing.tsx` `handleConfirmProSubscription`: quando **sem promo code aplicado** → abrir checkout com os 2 novos items; quando **com promo code** → manter fluxo atual (`pro_monthly` + discountId)
- `src/components/promo/ProTrialDialog.tsx`: copy "primeiro mês" → "por 7 dias"
- `src/i18n/locales/{pt,en}.json`: atualizar strings `proTrial.*`

## Parte 2 — Anti-fraude / cartões fake

Múltiplas camadas para tornar abuso impraticável:

### 2.1 Cobrança imediata de €2 (a mais importante)
Cartões fake / pré-pagos vazios **falham na cobrança inicial de €2** → checkout é rejeitado, nenhuma subscrição criada. Esta é a defesa mais eficaz e já vem grátis com a estrutura escolhida acima.

### 2.2 Restringir 1 trial por utilizador
Nova tabela `trial_redemptions` (`user_id` PK) + verificação no frontend antes de abrir checkout. Webhook regista entrada quando o `pro_trial_access_7d` é processado. Tentativa de 2º trial → mostra erro "Já utilizaste o teu trial. Subscreve por 9€/mês."

### 2.3 Bloquear emails descartáveis
Validação no `handleConfirmProSubscription`: rejeita domínios conhecidos de email temporário (mailinator, tempmail, 10minutemail, guerrillamail, etc.) com lista curta hardcoded.

### 2.4 Ativar Paddle Risk / 3DS (config Paddle)
Documentar para o user activar no dashboard Paddle:
- **Risk Settings** → ativar 3D Secure obrigatório
- **Fraud Protection** → ativar regras default (já vem ativo na maioria das contas)

Não é programático mas é prático mencionar.

### 2.5 Limitar tentativas de checkout
Edge function `pre-checkout-check` que verifica:
- User não tem trial ativo/usado
- Email não está em domínio bloqueado
- Não houve >3 tentativas de checkout falhadas nas últimas 24h (nova tabela `checkout_attempts`)

## Parte 3 — Dunning automático (cobrança após falhas)

Para subscrições que entrem em `past_due` (cartão expirou, fundos insuficientes, etc.):

### Comportamento
- **Dia 0** (webhook `subscription.updated → past_due`): email imediato
- **Dia +3**: lembrete se ainda past_due
- **Dia +6**: última notificação antes do cancelamento
- Paddle continua a fazer retries automáticos (configurado em dashboard)

### Implementação
1. Tabela `dunning_notifications` para idempotência (`subscription_id`, `reminder_type`, `sent_at`)
2. Edge function `send-dunning-email` (POST: userId, subscriptionId, type) → envia HTML estilizado via Resend, regista na tabela
3. Atualizar `payments-webhook` `handleSubscriptionUpdated`: se mudou para `past_due`, invocar `send-dunning-email` com type='initial'
4. Edge function `dunning-cron`: scanea subscriptions past_due, envia day3/day6 baseado em `current_period_end` + idempotência
5. Cron job pg_cron diário às 09:00 UTC → invoca `dunning-cron`
6. Cards dunning no `AdminOverview` (past_due count + últimos emails enviados)

### Templates (PT/EN)
- **Inicial**: "Não conseguimos processar o teu pagamento. Vamos tentar de novo nos próximos dias. Para garantir o acesso Pro, atualiza o método de pagamento."
- **Dia 3**: "Continuamos sem conseguir cobrar. Sem atualização, perdes o acesso em breve."
- **Dia 6**: "Última chance antes do cancelamento. Atualiza agora."

Todos com botão "Atualizar método" → abre customer portal Paddle existente.

## Ficheiros criados/editados

**Migrations:**
- Tabelas `trial_redemptions`, `checkout_attempts`, `dunning_notifications` + RLS
- Cron job pg_cron para dunning

**Edge functions (novas):**
- `send-dunning-email`
- `dunning-cron`
- `pre-checkout-check`

**Edge functions (editadas):**
- `payments-webhook` (regista trial_redemption, dispara dunning inicial)

**Frontend:**
- `src/pages/Pricing.tsx` (checkout 2-items, pre-check)
- `src/components/promo/ProTrialDialog.tsx` (copy)
- `src/i18n/locales/{pt,en}.json`
- `src/components/admin/AdminOverview.tsx` (cards past_due + trial usage)
- `src/lib/disposableEmails.ts` (lista de domínios bloqueados)

**Config:**
- `supabase/config.toml` (declarar novas funções verify_jwt=false)
- 2 novos preços Paddle via `create_price`

## Notas
- Resend já configurado (`RESEND_API_KEY`)
- Customer portal já existe (`customer-portal`)
- `PastDueBanner` já presente na UI
- Após publish, Paddle sincroniza preços para live automaticamente
