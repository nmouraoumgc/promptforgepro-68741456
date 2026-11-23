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
    if (!product || ![productFor('monthly'),productFor('annual')].includes(product)) return new Response(null,{status:204});
    if (first && (!obj.request_id || obj.status !== 'completed' || obj.order?.status !== 'paid')) {
      return new Response(null,{status:204});
    }
    // Fetch current state as checkout.completed can carry only a subscription ID.
    const subId = entityId(first ? obj.subscription : obj);
    if (!subId || !Number.isSafeInteger(event.created_at)) throw new Error('Invalid event');
    const admin = createClient(setting('SUPABASE_URL'), setting('SUPABASE_SERVICE_ROLE_KEY'));
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
