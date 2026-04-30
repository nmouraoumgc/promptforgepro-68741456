import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

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

// Map our human-readable price IDs to PromptForge plan tiers.
function priceIdToPlan(priceId: string): 'pro' | 'premium' | null {
  if (priceId === 'pro_monthly') return 'pro';
  if (priceId === 'premium_one_time') return 'premium';
  return null;
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;

  const userId = customData?.userId;
  if (!userId) {
    console.error('subscription.created: missing customData.userId');
    return;
  }

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

  // Sync profile.current_plan for client gating (only in live).
  if (env === 'live') {
    const plan = priceIdToPlan(priceId);
    if (plan) {
      await getSupabase().from('profiles').update({ current_plan: plan }).eq('id', userId);
    }
  }
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange } = data;

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
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  await getSupabase().from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', data.id)
    .eq('environment', env);

  // Downgrade plan in profile when canceled in live.
  if (env === 'live') {
    const { data: sub } = await getSupabase()
      .from('subscriptions')
      .select('user_id, price_id')
      .eq('paddle_subscription_id', data.id)
      .maybeSingle();
    if (sub && priceIdToPlan(sub.price_id as string) === 'pro') {
      await getSupabase().from('profiles').update({ current_plan: 'free' }).eq('id', sub.user_id);
    }
  }
}

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  // For one-time purchases (Premium). Subscriptions are handled separately.
  const { id, customData, items, customerId, currencyCode } = data;
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
  const plan = priceIdToPlan(priceExternalId);
  if (plan !== 'premium') return; // Pro is tracked via subscription events.

  // Record the purchase (idempotent on stripe_payment_id slot).
  const amountCents = Number(item?.price?.unitPrice?.amount ?? 0);
  await getSupabase().from('purchases').insert({
    user_id: userId,
    plan: 'premium',
    amount_cents: amountCents || 1900,
    currency: (currencyCode || 'EUR').toUpperCase(),
    status: 'completed',
    stripe_payment_id: id, // re-using existing column to store paddle txn id
  });

  // Upgrade the profile in live only.
  if (env === 'live') {
    await getSupabase().from('profiles').update({ current_plan: 'premium' }).eq('id', userId);
  }
  console.log('Premium purchase recorded', { userId, txn: id, env, customerId });
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
      await handleTransactionCompleted(event.data, env);
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
