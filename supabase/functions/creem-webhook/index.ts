import { createClient } from 'npm:@supabase/supabase-js@2';
import { creemEnvironment, creemRequest, productFor, setting, validSignature } from '../_shared/creem.ts';

const entityId = (entity: string | {id?: string} | null) => typeof entity === 'string' ? entity : entity?.id;
const lifecycle = new Set(['subscription.paid','subscription.active','subscription.update','subscription.canceled',
  'subscription.expired','subscription.paused','subscription.scheduled_cancel','subscription.past_due','subscription.unpaid']);

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response(null,{status:405});
  try {
    const raw = await req.text();
    if (!await validSignature(raw,req.headers.get('creem-signature'),setting('CREEM_WEBHOOK_SECRET'))) {
      return new Response(null,{status:401});
    }
    const event = JSON.parse(raw);
    const first = event.eventType === 'checkout.completed';
    if (!first && !lifecycle.has(event.eventType)) return new Response(null,{status:204});
    const obj = event.object;
    const env = creemEnvironment();
    const modes = env === 'live' ? ['prod'] : ['test','sandbox'];
    if (obj.mode && !modes.includes(obj.mode)) return new Response(null,{status:400});
    const product = entityId(obj.product) || entityId(obj.order?.product);
    const packsProduct = Deno.env.get('CREEM_PACKS_ID');
    if (!product || ![productFor('monthly'),productFor('annual'),packsProduct].includes(product)) return new Response(null,{status:204});
    if (first && (!obj.request_id || obj.status !== 'completed' || obj.order?.status !== 'paid')) {
      return new Response(null,{status:204});
    }
    const admin = createClient(setting('SUPABASE_URL'), setting('SUPABASE_SERVICE_ROLE_KEY'));
    if (first && packsProduct && product === packsProduct) {
      const orderId = entityId(obj.order);
      if (!orderId || !obj.request_id || obj.order?.currency !== 'EUR' || Number(obj.order?.amount_paid) !== 1900) throw new Error('Invalid one-time checkout');
      const {data: binding,error:bindingError} = await admin.from('creem_checkouts')
        .select('attempt_id,checkout_id,checkout_attempts!inner(user_id,status)')
        .eq('attempt_id',obj.request_id).eq('product_id',product).eq('environment',env).maybeSingle();
      if (bindingError || !binding || (binding.checkout_id && binding.checkout_id !== obj.id)) throw new Error('Checkout binding mismatch');
      const attempt = Array.isArray(binding.checkout_attempts) ? binding.checkout_attempts[0] : binding.checkout_attempts;
      if (!attempt?.user_id) throw new Error('Missing checkout owner');
      const {error:purchaseError} = await admin.from('purchases').upsert({
        user_id:attempt.user_id, plan:'packs', amount_cents:1900, currency:'EUR',
        status:'completed', creem_order_id:orderId,
      }, {onConflict:'creem_order_id',ignoreDuplicates:true});
      if (purchaseError) throw purchaseError;
      await admin.from('checkout_attempts').update({status:'completed',updated_at:new Date().toISOString()}).eq('id',obj.request_id);
      return new Response(null,{status:204});
    }
    // Fetch current state as checkout.completed can carry only a subscription ID.
    const subId = entityId(first ? obj.subscription : obj);
    if (!subId || !Number.isSafeInteger(event.created_at)) throw new Error('Invalid event');
    const lease = await admin.rpc('acquire_creem_sync', {p_subscription:subId});
    if (lease.error || !lease.data) throw new Error('Subscription synchronization busy');
    const sub = await creemRequest('subscriptions?subscription_id=' + encodeURIComponent(subId));
    const customer = entityId(sub.customer);
    if (sub.id !== subId || entityId(sub.product) !== product || !customer || !sub.current_period_end_date) {
      throw new Error('Missing subscription details');
    }
    // Scheduled cancellation retains the paid period. A fully canceled
    // Creem subscription revokes access even when its period end is future.
    const status = sub.status === 'scheduled_cancel' ? 'active'
      : sub.status === 'canceled' ? 'expired' : sub.status;
    const result = await admin.rpc('commit_creem_sync',{
      p_token:lease.data,
      p_request:first ? obj.request_id : null, p_checkout:first ? obj.id : null,
      p_subscription:subId, p_customer:customer, p_product:product, p_env:env,
      p_status:status, p_start:sub.current_period_start_date ?? null,
      p_end:sub.current_period_end_date, p_cancel:sub.status === 'scheduled_cancel',
    });
    if (result.error) throw result.error;
    return new Response(null,{status:204});
  } catch {
    // Retry transient provider/DB failures and events preceding the paid checkout binding.
    return new Response(null,{status:503});
  }
});
