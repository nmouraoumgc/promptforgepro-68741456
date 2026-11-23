import { pathToFileURL } from 'node:url';

const targets = {
  test: {api:'https://test-api.creem.io/v1/', rest:'https://nzhjzdmuevwsaldpqlxd.supabase.co/rest/v1/', modes:['test','sandbox']},
  live: {api:'https://api.creem.io/v1/', rest:'https://cwrxbxxfaemcvliasycz.supabase.co/rest/v1/', modes:['prod']},
};
const entityId = entity => typeof entity === 'string' ? entity : entity?.id;

export async function reconcileCheckout(checkoutId, request, mode = 'test') {
  const target = targets[mode];
  if (!target) throw new Error('Explicit Creem mode is required');
  const allowedModes = new Set(target.modes);
  const checkout = await request('checkouts?checkout_id=' + encodeURIComponent(checkoutId));
  const subscriptionId = entityId(checkout.subscription);
  const productId = entityId(checkout.product) || entityId(checkout.order?.product);
  if (checkout.id !== checkoutId || !allowedModes.has(checkout.mode) ||
      checkout.status !== 'completed' || checkout.order?.status !== 'paid' ||
      !checkout.request_id || !subscriptionId || !productId) {
    throw new Error('Creem did not confirm a completed paid checkout with a local binding');
  }

  const token = await request('rpc/acquire_creem_sync', {p_subscription:subscriptionId});
  if (!token) throw new Error('Subscription synchronization busy');
  const subscription = await request('subscriptions?subscription_id=' + encodeURIComponent(subscriptionId));
  const customerId = entityId(subscription.customer);
  if (subscription.id !== subscriptionId || entityId(subscription.product) !== productId ||
      !allowedModes.has(subscription.mode) || !customerId || !subscription.status ||
      !Number.isFinite(Date.parse(subscription.current_period_end_date))) {
    throw new Error('Creem subscription did not match the checkout');
  }

  const scheduled = subscription.status === 'scheduled_cancel';
  // The RPC locks and verifies the original request/checkout binding and environment.
  // The same lease fences manual recovery and webhook writes.
  await request('rpc/commit_creem_sync', {
    p_token:token,
    p_request: checkout.request_id,
    p_checkout: checkoutId,
    p_subscription: subscriptionId,
    p_customer: customerId,
    p_product: productId,
    p_env: mode === 'live' ? 'live' : 'sandbox',
    p_status: scheduled ? 'active' : subscription.status === 'canceled' ? 'expired' : subscription.status,
    p_start: subscription.current_period_start_date ?? null,
    p_end: subscription.current_period_end_date,
    p_cancel: scheduled,
  });
}

async function run() {
  const [checkoutId, ...extra] = process.argv.slice(2);
  if (!checkoutId || extra.length) throw new Error('Provide exactly one Creem checkout ID');
  const creemKey = process.env.CREEM_API_KEY;
  const qaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mode = process.env.CREEM_MODE;
  const target = targets[mode];
  if (!target || !creemKey || !qaKey || process.env.SUPABASE_URL !== target.rest.replace('/rest/v1/', '')) {
    throw new Error('Explicit matching CREEM_MODE, SUPABASE_URL and secure credentials are required');
  }

  await reconcileCheckout(checkoutId, async (path, body) => {
    const response = await fetch((body ? target.rest : target.api) + path, {
      method: body ? 'POST' : 'GET',
      headers: body
        ? {apikey: qaKey, authorization: 'Bearer ' + qaKey, 'content-type': 'application/json'}
        : {'x-api-key': creemKey},
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    }).catch(() => { throw new Error(body ? 'Supabase request failed' : 'Creem request failed'); });
    if (!response.ok) throw new Error((body ? 'Supabase' : 'Creem') + ' HTTP ' + response.status);
    if (!body || path === 'rpc/acquire_creem_sync') return response.json().catch(() => { throw new Error('Invalid Creem response'); });
  }, mode);
  console.log('Creem reconciliation RPC accepted. Verify the subscription and profile in the selected environment.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
