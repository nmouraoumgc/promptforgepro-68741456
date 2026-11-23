import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileCheckout } from '../scripts/billing/reconcile-checkout.mjs';

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
    if (path === 'rpc/acquire_creem_sync') return 'lease_test';
    assert.equal(path, 'rpc/commit_creem_sync');
    writes.push(body);
  };
  return {request, writes};
}

test('reconciliation checks Creem and submits only a sandbox binding with a minimal ordering watermark', async () => {
  const {request, writes} = fixture();
  await reconcileCheckout('ch_test', request);
  assert.deepEqual(writes, [{
    p_token:'lease_test', p_request:'attempt_test', p_checkout:'ch_test', p_subscription:'sub_test', p_customer:'cust_test',
    p_product:'prod_test', p_env:'sandbox', p_status:'active',
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

test('Live recovery uses the Live environment and rejects Sandbox records', async () => {
  const liveCheckout = {...checkout, mode:'prod'};
  const liveSubscription = {...subscription, mode:'prod',status:'canceled'};
  const {request,writes} = fixture(liveCheckout,liveSubscription);
  await reconcileCheckout('ch_test',request,'live');
  assert.equal(writes[0].p_env,'live');
  assert.equal(writes[0].p_status,'expired');
  const sandbox = fixture();
  await assert.rejects(reconcileCheckout('ch_test',sandbox.request,'live'));
  assert.deepEqual(sandbox.writes,[]);
});
