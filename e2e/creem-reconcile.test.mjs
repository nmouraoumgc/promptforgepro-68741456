import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileCheckout } from '../scripts/creem-qa/reconcile-checkout.mjs';

const checkout = {
  id: 'ch_test', mode: 'test', request_id: 'attempt_test', status: 'completed',
  order: {status: 'paid'}, product: {id: 'prod_test'}, subscription: {id: 'sub_test'},
};
const subscription = {
  id: 'sub_test', mode: 'test', product: {id: 'prod_test'}, customer: {id: 'cust_test'},
  status: 'active', current_period_start_date: '2026-11-23T00:00:00Z',
  current_period_end_date: '2026-12-23T00:00:00Z',
};

function fixture(currentCheckout = checkout, currentSubscription = subscription) {
  const writes = [];
  const request = async (path, body) => {
    if (path === 'checkouts?checkout_id=ch_test') return currentCheckout;
    if (path === 'subscriptions?subscription_id=sub_test') return currentSubscription;
    assert.equal(path, 'rpc/apply_creem_subscription');
    writes.push(body);
  };
  return {request, writes};
}

test('reconciliation checks Creem and submits only a sandbox binding with a minimal ordering watermark', async () => {
  const {request, writes} = fixture();
  await reconcileCheckout('ch_test', request);
  assert.deepEqual(writes, [{
    p_request:'attempt_test', p_checkout:'ch_test', p_subscription:'sub_test', p_customer:'cust_test',
    p_product:'prod_test', p_env:'sandbox', p_event_at:0, p_status:'active',
    p_start:'2026-11-23T00:00:00Z', p_end:'2026-12-23T00:00:00Z', p_cancel:false,
  }]);
});

test('reconciliation refuses unpaid, mismatched or Live records before writing', async () => {
  const cases = [
    [{...checkout, order:{status:'failed'}}, subscription],
    [{...checkout, mode:'prod'}, subscription],
    [{...checkout, id:'ch_other'}, subscription],
    [checkout, {...subscription, product:{id:'different'}}],
    [checkout, {...subscription, mode:'prod'}],
    [checkout, {...subscription, current_period_end_date:null}],
  ];
  for (const [badCheckout, badSubscription] of cases) {
    const {request, writes} = fixture(badCheckout,badSubscription);
    await assert.rejects(reconcileCheckout('ch_test', request));
    assert.deepEqual(writes, []);
  }
});
