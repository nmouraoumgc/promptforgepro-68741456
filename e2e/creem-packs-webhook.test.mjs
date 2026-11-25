import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {loadEdge} from './helpers/edgeHarness.mjs';

const env={SUPABASE_URL:'https://nzhjzdmuevwsaldpqlxd.supabase.co',CREEM_MODE:'test',
  CREEM_WEBHOOK_SECRET:'qa-only-test-secret',CREEM_PACKS_ID:'prod_packs',
  CREEM_PRO_MONTHLY_ID:'prod_monthly',CREEM_PRO_ANNUAL_ID:'prod_annual'};
const owner='10000000-0000-4000-8000-000000000001';
const binding={attempt_id:'10000000-0000-4000-8000-000000000002',checkout_id:'ch_packs',checkout_attempts:{user_id:owner,status:'initiated'}};
const event={eventType:'checkout.completed',object:{id:'ch_packs',mode:'test',product:'prod_packs',request_id:binding.attempt_id,
  status:'completed',order:{id:'ord_packs',status:'paid',currency:'EUR',amount_paid:1900}}};

test('Packs webhook requires signed paid EUR 19 order and binds the owner; duplicate delivery is harmless',async()=>{
  const orders=new Map(); let completed=0;
  const client={from(table){
    if(table==='creem_checkouts')return {select:()=>({eq:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:binding,error:null})})})})})};
    if(table==='purchases')return {upsert:async(data)=>{
      if (!orders.has(data.creem_order_id)) orders.set(data.creem_order_id,data);
      return {error:null};
    }};
    if(table==='checkout_attempts')return {update:()=>({eq:async()=>{completed++;return {error:null}}})};
    throw Error('unexpected table '+table);
  }};
  const handler=await loadEdge('supabase/functions/creem-webhook/index.ts',{env,clientFactory:()=>client});
  const deliver=async(e,signatureValid=true)=>{
    const body=JSON.stringify(e);
    const signature=signatureValid?createHmac('sha256',env.CREEM_WEBHOOK_SECRET).update(body).digest('hex'):'0'.repeat(64);
    return (await handler(new Request('https://qa.invalid',{method:'POST',headers:{'creem-signature':signature},body}))).status;
  };
  assert.equal(await deliver(event,false),401);
  assert.equal(await deliver({...event,object:{...event.object,order:{...event.object.order,status:'failed'}}}),204);
  assert.equal(await deliver({...event,object:{...event.object,order:{...event.object.order,amount_paid:0}}}),503);
  assert.equal(orders.size,0);
  assert.equal(await deliver(event),204);
  assert.equal(await deliver(event),204);
  assert.equal(orders.size,1);
  assert.equal(orders.get('ord_packs').user_id,owner);
  assert.equal(orders.get('ord_packs').plan,'packs');
  assert.equal(completed,2);
});
