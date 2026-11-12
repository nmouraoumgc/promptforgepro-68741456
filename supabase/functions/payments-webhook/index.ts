import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, gatewayFetch, priceExternalIdOf, type PaddleEnv } from '../_shared/paddle.ts';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }
  return _supabase;
}

// ---------- Promo redemption tracking ----------
// Paddle webhooks include the discount object as `discount` (with `id` and `code`).
async function incrementPromoUsage(env: PaddleEnv, discount: any) {
  if (!discount?.id) return;
  try {
    // Resolve the discount code from Paddle (the webhook event sometimes only carries the id).
    let code: string | undefined = discount.code;
    if (!code) {
      const resp = await gatewayFetch(env, `/discounts/${discount.id}`);
      const json = await resp.json();
      code = json?.data?.code;
    }
    if (!code) return;

    // Best-effort increment; we don't reject the webhook if the code isn't in our DB
    // (could be a Paddle-only discount).
    const { data, error } = await getSupabase().rpc('increment_promo_usage', { _code: code });
    if (error) console.warn('promo increment failed', error.message);
    else console.log('promo incremented', { code, ok: data });
  } catch (e) {
    console.warn('incrementPromoUsage error', e instanceof Error ? e.message : String(e));
  }
}

const TRIAL_PRICE_IDS = new Set(['pro_monthly_trial_7d', 'pro_trial_access_7d']);

async function recordTrialRedemption(userId: string, subscriptionId?: string, transactionId?: string) {
  try {
    await getSupabase().from('trial_redemptions').upsert({
      user_id: userId,
      paddle_subscription_id: subscriptionId ?? null,
      paddle_transaction_id: transactionId ?? null,
    }, { onConflict: 'user_id' });
  } catch (e) {
    console.warn('recordTrialRedemption failed', e instanceof Error ? e.message : String(e));
  }
}

async function triggerInitialDunning(userId: string, subscriptionId: string) {
  try {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-dunning-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ userId, subscriptionId, type: 'initial' }),
    });
  } catch (e) {
    console.warn('triggerInitialDunning failed', e instanceof Error ? e.message : String(e));
  }
}

// ---------- checkout_attempts loop closing ----------
// Paddle creates a transaction as soon as the overlay opens; the attempt row is created
// by pre-checkout-check just before and its id travels as customData.attemptId.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findAttemptId(data: any): Promise<string | null> {
  const txnId: string | undefined = data?.id;
  const customData = data?.customData ?? {};
  const sb = getSupabase();
  if (txnId) {
    const { data: byTxn } = await sb.from('checkout_attempts')
      .select('id').eq('paddle_transaction_id', txnId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (byTxn?.id) return byTxn.id as string;
  }
  const attemptId = typeof customData.attemptId === 'string' && UUID_RE.test(customData.attemptId)
    ? customData.attemptId : null;
  if (attemptId) {
    const q = sb.from('checkout_attempts').select('id').eq('id', attemptId);
    const { data: byId } = customData.userId ? await q.eq('user_id', customData.userId).maybeSingle() : await q.maybeSingle();
    if (byId?.id) return byId.id as string;
  }
  // Fallback for checkouts opened without attemptId: latest open attempt of this user
  // created up to 2h before the transaction.
  const userId = customData.userId;
  if (userId && UUID_RE.test(userId)) {
    const createdAt = data?.createdAt ? new Date(data.createdAt) : new Date();
    const { data: byUser } = await sb.from('checkout_attempts')
      .select('id').eq('user_id', userId).is('paddle_transaction_id', null)
      .in('status', ['initiated', 'abandoned'])
      .lte('created_at', new Date(createdAt.getTime() + 60_000).toISOString())
      .gte('created_at', new Date(createdAt.getTime() - 2 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (byUser?.id) return byUser.id as string;
  }
  return null;
}

async function updateCheckoutAttempt(data: any, newStatus: 'completed' | 'failed' | null, reason?: string) {
  try {
    // Only transactions opened from our checkout (origin web, or origin api for discount-code
    // transactions created by pre-checkout-check with customData.attemptId) map to attempts;
    // subscription renewals have no attempt and are skipped.
    const apiAttempt = data?.origin === 'api' && typeof data?.customData?.attemptId === 'string';
    if (data?.origin && data.origin !== 'web' && !apiAttempt) return;
    const id = await findAttemptId(data);
    if (!id) return;
    const sb = getSupabase();
    const { data: row } = await sb.from('checkout_attempts')
      .select('status, paddle_transaction_id').eq('id', id).maybeSingle();
    if (!row) return;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (!row.paddle_transaction_id && data?.id) patch.paddle_transaction_id = data.id;
    const cc = data?.address?.countryCode;
    if (typeof cc === 'string' && /^[A-Z]{2}$/.test(cc)) patch.country = cc;
    if (newStatus === 'completed' && row.status !== 'completed') patch.status = 'completed';
    if (newStatus === 'failed' && (row.status === 'initiated' || row.status === 'abandoned')) {
      patch.status = 'failed';
      if (reason) patch.reason = reason.slice(0, 200);
    }
    if (row.paddle_transaction_id && data?.id && row.paddle_transaction_id !== data.id && newStatus === null) return;
    await sb.from('checkout_attempts').update(patch).eq('id', id);
  } catch (e) {
    console.warn('updateCheckoutAttempt failed', e instanceof Error ? e.message : String(e));
  }
}

function lastPaymentErrorCode(data: any): string | undefined {
  const payments: any[] = Array.isArray(data?.payments) ? data.payments : [];
  const p = payments.find((x) => x?.errorCode) ?? payments[0];
  return p?.errorCode ?? p?.status ?? undefined;
}

// ---------- Discount enforcement ----------
// Discount codes are only valid on transactions created server-side by pre-checkout-check (which checks
// confirmed email + once per account and records a checkout_attempts row with discount_code + txn id).
// Paddle.js can still be driven by hand with a code/discount id (codes with enabled_for_checkout=true),
// so every checkout transaction carrying a discount is checked here:
//  * discount_not_issued_by_server: no server-issued attempt for this transaction/account
//  * discount_mismatch: the transaction carries a different discount than the one we issued
//  * discount_already_used: the same code already completed on this account
// Findings are logged to public.discount_flags (Admin > Alertas) for review. Paddle is read-only from
// here except for the pre-existing cancel of 0-charge subscriptions; charged transactions are never
// refunded or cancelled automatically.
type DiscountCheck = {
  reason: 'discount_not_issued_by_server' | 'discount_already_used' | 'discount_mismatch';
  txn: any; code: string | null; issuedCode: string | null; email: string | null;
};

async function getTxn(env: PaddleEnv, txnId: string): Promise<any | null> {
  const r = await gatewayFetch(env, `/transactions/${encodeURIComponent(txnId)}?include=discount`);
  if (!r.ok) return null;
  return (await r.json())?.data ?? null;
}

async function checkDiscount(env: PaddleEnv, txnId: string, userId: string): Promise<DiscountCheck | null> {
  const txn = await getTxn(env, txnId);
  if (!txn?.discount_id) return null;
  const code: string | null = typeof txn?.discount?.code === 'string' ? txn.discount.code.toUpperCase() : null;
  const sb = getSupabase();
  const { data: attempt } = await sb.from('checkout_attempts')
    .select('id, user_id, email, discount_code').eq('paddle_transaction_id', txnId)
    .not('discount_code', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const base = { txn, code, issuedCode: (attempt?.discount_code as string | undefined) ?? null, email: (attempt?.email as string | undefined) ?? null };
  if (!attempt || attempt.user_id !== userId) return { reason: 'discount_not_issued_by_server', ...base };
  if (code && code !== attempt.discount_code) return { reason: 'discount_mismatch', ...base };
  const { count } = await sb.from('checkout_attempts').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('discount_code', attempt.discount_code).eq('status', 'completed').neq('id', attempt.id);
  if ((count ?? 0) > 0) return { reason: 'discount_already_used', ...base };
  return null;
}

function chargedMinor(txn: any): number {
  const t = txn?.details?.totals;
  const v = Number(t?.grand_total ?? t?.total);
  return Number.isFinite(v) ? v : 1; // unknown -> treat as charged
}

async function flagDiscount(env: PaddleEnv, userId: string, c: DiscountCheck,
  action: 'flagged' | 'subscription_cancelled' | 'access_withheld') {
  try {
    const sb = getSupabase();
    const txn = c.txn;
    let email = c.email;
    if (!email && UUID_RE.test(userId)) {
      const { data: p } = await sb.from('profiles').select('email').eq('id', userId).maybeSingle();
      email = (p?.email as string | undefined) ?? null;
    }
    const item = txn?.items?.[0];
    const currency = typeof txn?.currency_code === 'string' && /^[A-Z]{3}$/.test(txn.currency_code) ? txn.currency_code : null;
    const row = {
      environment: env,
      user_id: UUID_RE.test(userId) ? userId : null,
      email,
      transaction_id: txn.id,
      subscription_id: txn.subscription_id ?? null,
      kind: txn.subscription_id ? 'subscription' : (item ? 'one_time' : 'other'),
      price_external_id: priceExternalIdOf(item?.price) ?? item?.price?.id ?? null,
      discount_id: txn.discount_id ?? null,
      discount_code: c.code,
      issued_code: c.issuedCode,
      reason: c.reason,
      charged_minor: chargedMinor(txn),
      currency,
      action_taken: action,
    };
    const { error } = await sb.from('discount_flags').upsert(row, { onConflict: 'transaction_id,reason', ignoreDuplicates: true });
    if (error) console.warn('discount flag insert failed', error.message);
    if (action !== 'flagged') {
      await sb.from('discount_flags').update({ action_taken: action }).eq('transaction_id', txn.id).eq('reason', c.reason);
    }
    console.warn('DISCOUNT FLAG', { txn: txn.id, reason: c.reason, charged: row.charged_minor, currency, action });
  } catch (e) {
    console.warn('flagDiscount failed', e instanceof Error ? e.message : String(e));
  }
}

// subscription.created: cancel when nothing was charged (pre-existing behaviour), flag otherwise.
// Returns true if the subscription was blocked.
async function enforceDiscount(data: any, env: PaddleEnv, userId: string): Promise<boolean> {
  try {
    const txnId: string | undefined = data?.transactionId ?? data?.transaction_id;
    if (!txnId) return false;
    const c = await checkDiscount(env, txnId, userId);
    if (!c) return false;
    if (chargedMinor(c.txn) === 0) {
      const r = await gatewayFetch(env, `/subscriptions/${encodeURIComponent(data.id)}/cancel`, {
        method: 'POST', body: JSON.stringify({ effective_from: 'immediately' }),
      });
      console.warn('discount enforcement: cancelled subscription', { sub: data.id, txn: txnId, reason: c.reason, status: r.status });
      await flagDiscount(env, userId, c, r.ok ? 'subscription_cancelled' : 'flagged');
      await getSupabase().from('checkout_attempts').update({ status: 'blocked', reason: c.reason, updated_at: new Date().toISOString() })
        .eq('paddle_transaction_id', txnId);
      return r.ok;
    }
    await flagDiscount(env, userId, c, 'flagged');
    return false;
  } catch (e) {
    console.warn('enforceDiscount failed', e instanceof Error ? e.message : String(e));
    return false;
  }
}

// transaction.completed (one-time purchases and first subscription payments). Returns true when access
// must be withheld (a one-time purchase that cost 0 because of a discount we did not issue).
async function checkCompletedTransactionDiscount(data: any, env: PaddleEnv, userId: string): Promise<boolean> {
  try {
    const hasDiscount = !!(data?.discountId ?? data?.discount?.id ?? data?.discount_id);
    if (!hasDiscount || !data?.id) return false;
    const apiAttempt = data?.origin === 'api' && typeof data?.customData?.attemptId === 'string';
    if (data?.origin && data.origin !== 'web' && !apiAttempt) return false; // renewals inherit the subscription discount
    const c = await checkDiscount(env, data.id, userId);
    if (!c) return false;
    const withhold = !c.txn?.subscription_id && chargedMinor(c.txn) === 0;
    await flagDiscount(env, userId, c, withhold ? 'access_withheld' : 'flagged');
    return withhold;
  } catch (e) {
    console.warn('checkCompletedTransactionDiscount failed', e instanceof Error ? e.message : String(e));
    return false;
  }
}

// ---------- Subscription handlers ----------
async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData, discount } = data;

  const userId = customData?.userId;
  if (!userId) {
    console.error('subscription.created: missing customData.userId');
    return;
  }

  if (await enforceDiscount(data, env, userId)) return;

  const item = items[0];
  const priceId = priceExternalIdOf(item?.price); // pro_monthly, pro_annual (alias), ...
  const productId = item?.product?.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn('Skipping subscription: missing importMeta.externalId', {
      rawPriceId: item?.price?.id,
      rawProductId: item?.product?.id,
    });
    return;
  }

  await getSupabase().from('subscriptions').upsert({
    user_id: userId,
    paddle_subscription_id: id,
    paddle_customer_id: customerId,
    product_id: productId,
    price_id: priceId,
    status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'paddle_subscription_id' });

  // If this is the 7-day paid-trial subscription, record trial redemption.
  if (TRIAL_PRICE_IDS.has(priceId)) {
    await recordTrialRedemption(userId, id);
  }

  // Plan sync is handled by the DB trigger `sync_profile_plan_from_subscription`.
  await incrementPromoUsage(env, discount);
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, customData } = data;

  // Detect transition into past_due to fire initial dunning email.
  const { data: existing } = await getSupabase()
    .from('subscriptions')
    .select('user_id, status')
    .eq('paddle_subscription_id', id)
    .eq('environment', env)
    .maybeSingle();

  await getSupabase().from('subscriptions')
    .update({
      status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      cancel_at_period_end: scheduledChange?.action === 'cancel',
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', id)
    .eq('environment', env);

  if (status === 'past_due' && existing?.status !== 'past_due') {
    const userId = (existing?.user_id as string | undefined) ?? customData?.userId;
    if (userId) await triggerInitialDunning(userId, id);
  }
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  // We only flip status; current_period_end is preserved so the trigger keeps
  // the user as Pro until the period actually ends (grace period).
  await getSupabase().from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', data.id)
    .eq('environment', env);
}

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  // One-time purchases (Prompt Packs, price premium_one_time). Since 2026-10-30 they are recorded as
  // plan 'packs' (premium Prompt Packs + all Learn lessons, Free limits otherwise). Existing 'premium'
  // purchase rows are grandfathered with full access. Subscription renewals also fire this event,
  // so we filter by price external id.
  const { id, customData, items, currencyCode, discount } = data;
  const userId = customData?.userId;
  // Signed Paddle completion event: flag for human review only, never refund or revoke access.
  if (typeof id === 'string' && typeof userId === 'string' && UUID_RE.test(userId)) {
    const { error } = await getSupabase().rpc('flag_suspicious_payment', { _transaction_id: id, _user_id: userId, _environment: env });
    // Alert errors must not prevent paying customers receiving access.
    if (error) console.error('fraud alert recording failed', error.message);
  }
  if (!userId) {
    console.warn('transaction.completed: no userId in customData, skipping');
    return;
  }

  const item = items?.[0];
  const priceExternalId = priceExternalIdOf(item?.price);
  if (!priceExternalId) {
    console.warn('transaction.completed: missing importMeta.externalId');
    return;
  }

  // First payments of Pro subscriptions: flag unverified discounts (subscription.created handles cancel).
  if (priceExternalId !== 'premium_one_time') await checkCompletedTransactionDiscount(data, env, userId);

  // Record trial redemption on the €2 one-time access transaction.
  if (priceExternalId === 'pro_trial_access_7d') {
    await recordTrialRedemption(userId, undefined, id);
    return;
  }
  if (priceExternalId !== 'premium_one_time') return; // Pro renewals tracked via subscription events.

  // Idempotency: skip if we already recorded this transaction id.
  const { data: existing } = await getSupabase()
    .from('purchases')
    .select('id')
    .eq('stripe_payment_id', id)
    .maybeSingle();
  if (existing) {
    console.log('transaction already recorded', id);
    return;
  }

  if (await checkCompletedTransactionDiscount(data, env, userId)) {
    console.warn('Prompt Packs access withheld: 0-charge transaction with a discount not issued by the server', { txn: id });
    return;
  }

  const amountCents = Number(item?.price?.unitPrice?.amount ?? 0) || 1900;
  await getSupabase().from('purchases').insert({
    user_id: userId,
    plan: 'packs',
    amount_cents: amountCents,
    currency: (currencyCode || 'EUR').toUpperCase(),
    status: 'completed',
    stripe_payment_id: id,
  });

  // Plan sync handled by trigger.
  await incrementPromoUsage(env, discount);
  console.log('Prompt Packs purchase recorded', { userId, txn: id, env });
}

const FAILED_PAYMENT_STATUSES = new Set(['error', 'canceled', 'dropped']);

async function handleTransactionPaymentFailed(data: any, env: PaddleEnv) {
  // Renewals: subscription.updated also fires with status=past_due, so the DB trigger keeps the user as
  // Pro during the grace window. Checkout transactions: every failed payment attempt is recorded in
  // payment_failures (deduped by Paddle payment_attempt_id) so pre-checkout-check can enforce the
  // per-account / per-IP failure limits, also while a checkout is still open.
  console.log('payment_failed', { txn: data?.id, sub: data?.subscriptionId, origin: data?.origin, env });
  try {
    const apiAttempt = data?.origin === 'api' && typeof data?.customData?.attemptId === 'string';
    if (data?.origin && data.origin !== 'web' && !apiAttempt) return;
    const sb = getSupabase();
    const attemptId = await findAttemptId(data);
    let attempt: any = null;
    if (attemptId) {
      ({ data: attempt } = await sb.from('checkout_attempts').select('id, user_id, ip_hash, status').eq('id', attemptId).maybeSingle());
    }
    const cdUser = typeof data?.customData?.userId === 'string' && UUID_RE.test(data.customData.userId) ? data.customData.userId : null;
    const userId: string | null = attempt?.user_id ?? cdUser;
    if (!userId) return;
    const txnId = typeof data?.id === 'string' && /^txn_[a-z0-9]{26}$/.test(data.id) ? data.id : null;
    const payments: any[] = Array.isArray(data?.payments) ? data.payments : [];
    let failed = payments.filter((p) => p?.errorCode || FAILED_PAYMENT_STATUSES.has(p?.status));
    if (!failed.length) failed = [{ paymentAttemptId: null, errorCode: lastPaymentErrorCode(data) }];
    for (const p of failed) {
      const ref = typeof p?.paymentAttemptId === 'string' ? p.paymentAttemptId.slice(0, 80) : (txnId ? `${txnId}:${p?.createdAt ?? 'na'}` : null);
      const { error } = await sb.from('payment_failures').insert({
        user_id: userId, attempt_id: attempt?.id ?? null, ip_hash: attempt?.ip_hash ?? null, transaction_id: txnId,
        source: 'webhook', ref, error: [p?.errorCode, p?.status].filter(Boolean).join(' | ').slice(0, 200) || null, environment: env,
      });
      if (error && error.code !== '23505') throw new Error(`payment_failures insert failed: ${error.message}`);
    }
    // Paddle events may arrive out of order: a late failure must also flag a completed checkout.
    if (attempt?.status === 'completed' && txnId) {
      const { error } = await sb.rpc('flag_suspicious_payment', { _transaction_id: txnId, _user_id: userId, _environment: env });
      if (error) throw new Error(`fraud alert recording failed: ${error.message}`);
    }
  } catch (e) {
    console.warn('record payment failure failed', e instanceof Error ? e.message : String(e));
  }
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    case EventName.TransactionCompleted:
      await updateCheckoutAttempt(event.data, 'completed');
      await handleTransactionCompleted(event.data, env);
      break;
    case EventName.TransactionPaymentFailed:
      await updateCheckoutAttempt(event.data, 'failed', lastPaymentErrorCode(event.data));
      await handleTransactionPaymentFailed(event.data, env);
      break;
    case EventName.TransactionCreated:
    case EventName.TransactionReady:
    case EventName.TransactionUpdated:
      // Link the Paddle transaction id to the attempt (status unchanged).
      await updateCheckoutAttempt(event.data, null);
      break;
    default:
      console.log('Unhandled event:', event.eventType);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;
  try {
    await handleWebhook(req, env);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});
