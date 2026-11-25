import test from 'node:test';
import assert from 'node:assert/strict';
import {loadEdge} from './helpers/edgeHarness.mjs';

test('admin metrics keep provider counts but mark Paddle financials unavailable during an API outage', async()=>{
  const rows=[
    {status:'active',paddle_subscription_id:'sub_trial',creem_subscription_id:null,current_period_end:'2099-01-01'},
    {status:'active',paddle_subscription_id:'sub_paid',creem_subscription_id:null,current_period_end:'2099-01-01'},
    {status:'expired',paddle_subscription_id:null,creem_subscription_id:'sub_expired',current_period_end:'2020-01-01'},
    {status:'active',paddle_subscription_id:null,creem_subscription_id:'sub_creem',current_period_end:'2099-01-01'},
  ];
  const client={auth:{getUser:async()=>({data:{user:{id:'admin-qa'}}})},
    rpc:async()=>({data:[],error:null}),
    from(table){
      if(table==='user_roles')return {select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'admin'}})})})})};
      if(table==='subscriptions')return {select:async()=>({data:rows,error:null})};
      throw Error('Unexpected table '+table);
    }};
  const edge=await loadEdge('supabase/functions/admin-metrics/index.ts',{
    env:{PADDLE_LIVE_API_KEY:'qa-fake-key'},clientFactory:()=>client,fetch:async()=>new Response('',{status:503}),
  });
  const response=await edge(new Request('https://qa.invalid',{headers:{Authorization:'Bearer qa-test'}}));
  assert.equal(response.status,200);
  const metrics=await response.json();
  assert.equal(metrics.provider_health.paddle,'unavailable');
  assert.equal(metrics.paddle_data_complete,false);
  assert.equal(metrics.financial_data_complete,false);
  assert.deepEqual(metrics.provider_subscriptions,{paddle:2,creem:2,paddle_active:2,creem_active:1});
  // A trial is active but is not a paying customer.
  assert.deepEqual(metrics.paying_user_ids,[]);
});
