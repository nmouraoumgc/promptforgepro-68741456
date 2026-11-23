import { pathToFileURL } from 'node:url';

const sandboxApi = 'https://test-api.creem.io/v1/';
const qaRest = 'https://nzhjzdmuevwsaldpqlxd.supabase.co/rest/v1/';
const sandboxModes = new Set(['test','sandbox']);
const entityId = entity => typeof entity === 'string' ? entity : entity?.id;

export async function reconcileCheckout(checkoutId, request) {
  const checkout = await request('checkouts?checkout_id=' + encodeURIComponent(checkoutId));
  const subscriptionId = entityId(checkout.subscription);
  const productId = entityId(checkout.product) || entityId(checkout.order?.product);
  if (checkout.id !== checkoutId || !sandboxModes.has(checkout.mode) ||
      checkout.status !== 'completed' || checkout.order?.status !== 'paid' ||
      !checkout.request_id || !subscriptionId || !productId) {
    throw new Error('Creem did not confirm a completed paid Sandbox checkout with a local binding');
  }

  const subscription = await request('subscriptions?subscription_id=' + encodeURIComponent(subscriptionId));
  const customerId = entityId(subscription.customer);
  if (subscription.id !== subscriptionId || entityId(subscription.product) !== productId ||
      !sandboxModes.has(subscription.mode) || !customerId || !subscription.status ||
      !Number.isFinite(Date.parse(subscription.current_period_end_date))) {
    throw new Error('Creem subscription did not match the Sandbox checkout');
  }

  const scheduled = subscription.status === 'scheduled_cancel';
  // The RPC locks and verifies the original request/checkout binding and environment.
  // Zero lets any genuine webhook take precedence and prevents replay over an applied event.
  await request('rpc/apply_creem_subscription', {
    p_request: checkout.request_id,
    p_checkout: checkoutId,
    p_subscription: subscriptionId,
    p_customer: customerId,
    p_product: productId,
    p_env: 'sandbox',
    p_event_at: 0,
    p_status: scheduled ? 'active' : subscription.status === 'canceled' ? 'expired' : subscription.status,
    p_start: subscription.current_period_start_date ?? null,
    p_end: subscription.current_period_end_date,
    p_cancel: scheduled,
  });
}

async function run() {
  const [checkoutId, ...extra] = process.argv.slice(2);
  if (!checkoutId || extra.length) throw new Error('Provide exactly one Creem Sandbox checkout ID');
  const creemKey = process.env.CREEM_API_KEY;
  const qaKey = process.env.SUPABASE_QA_SERVICE_ROLE_KEY;
  if (process.env.CREEM_MODE !== 'test' || !creemKey || !qaKey) {
    throw new Error('CREEM_MODE=test and secure Sandbox and QA credentials are required');
  }

  await reconcileCheckout(checkoutId, async (path, body) => {
    const response = await fetch((body ? qaRest : sandboxApi) + path, {
      method: body ? 'POST' : 'GET',
      headers: body
        ? {apikey: qaKey, authorization: 'Bearer ' + qaKey, 'content-type': 'application/json'}
        : {'x-api-key': creemKey},
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    }).catch(() => { throw new Error(body ? 'Supabase QA request failed' : 'Creem Sandbox request failed'); });
    if (!response.ok) throw new Error((body ? 'Supabase QA' : 'Creem Sandbox') + ' HTTP ' + response.status);
    if (!body) return response.json().catch(() => { throw new Error('Invalid Creem Sandbox response'); });
  });
  console.log('Sandbox reconciliation RPC accepted. Verify the subscription and profile in QA.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
