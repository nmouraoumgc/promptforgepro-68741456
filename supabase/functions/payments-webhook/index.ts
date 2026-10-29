import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

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
// Paddle.js can still be driven by hand with a code/discount id, so a subscription whose first transaction
// carries a discount that we did not issue (or a second redemption on the same account) is cancelled
// immediately when nothing was charged, and flagged for review otherwise. Returns true if it was blocked.
async function enforceDiscount(data: any, env: PaddleEnv, userId: string): Promise<boolean> {
  try {
    const txnId: string | undefined = data?.transactionId ?? data?.transaction_id;
    if (!txnId) return false;
    const r = await gatewayFetch(env, `/transactions/${encodeURIComponent(txnId)}`);
    if (!r.ok) return false;
    const txn = (await r.json())?.data;
    if (!txn?.discount_id) return false;
    const sb = getSupabase();
    const { data: attempt } = await sb.from('checkout_attempts')
      .select('id, user_id, discount_code').eq('paddle_transaction_id', txnId)
      .not('discount_code', 'is', null).maybeSingle();
    let reason: string | null = null;
    if (!attempt || attempt.user_id !== userId) {
      reason = 'discount_not_issued_by_server';
    } else {
      const { count } = await sb.from('checkout_attempts').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('discount_code', attempt.discount_code).eq('status', 'completed').neq('id', attempt.id);
      if ((count ?? 0) > 0) reason = 'discount_already_used';
    }
    if (!reason) return false;
    const charged = Number(txn?.details?.totals?.grand_total ?? txn?.details?.totals?.total ?? '1');
    if (charged === 0) {
      const c = await gatewayFetch(env, `/subscriptions/${encodeURIComponent(data.id)}/cancel`, {
        method: 'POST', body: JSON.stringify({ effective_from: 'immediately' }),
      });
      console.warn('discount enforcement: cancelled subscription', { sub: data.id, txn: txnId, reason, status: c.status });
      if (attempt?.id) await sb.from('checkout_attempts').update({ status: 'blocked', reason, updated_at: new Date().toISOString() }).eq('id', attempt.id);
      return true;
    }
    console.warn('discount enforcement: paid transaction with unverified discount, review manually', { sub: data.id, txn: txnId, reason });
    return false;
  } catch (e) {
    console.warn('enforceDiscount failed', e instanceof Error ? e.message : String(e));
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
  const priceId = item?.price?.importMeta?.externalId;
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
  // One-time purchases (Premium). Subscription renewals also fire this event,
  // so we filter by price external id.
  const { id, customData, items, currencyCode, discount } = data;
  const userId = customData?.userId;
  if (!userId) {
    console.warn('transaction.completed: no userId in customData, skipping');
    return;
  }

  const item = items?.[0];
  const priceExternalId = item?.price?.importMeta?.externalId;
  if (!priceExternalId) {
    console.warn('transaction.completed: missing importMeta.externalId');
    return;
  }

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

  const amountCents = Number(item?.price?.unitPrice?.amount ?? 0) || 1900;
  await getSupabase().from('purchases').insert({
    user_id: userId,
    plan: 'premium',
    amount_cents: amountCents,
    currency: (currencyCode || 'EUR').toUpperCase(),
    status: 'completed',
    stripe_payment_id: id,
  });

  // Plan sync handled by trigger.
  await incrementPromoUsage(env, discount);
  console.log('Premium purchase recorded', { userId, txn: id, env });
}

async function handleTransactionPaymentFailed(data: any, env: PaddleEnv) {
  // Subscription.updated also fires with status=past_due, so the DB trigger
  // already keeps the user as Pro during the grace window. Here we just log
  // for observability; the frontend reads `status='past_due'` from subscriptions.
  console.log('payment_failed', { txn: data?.id, sub: data?.subscriptionId, env });
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
