import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { loadEdge } from './helpers/edgeHarness.mjs';
import { withOptimizationQuota, promptFingerprint } from '../supabase/functions/_shared/optimizationQuota.ts';
const require = createRequire(import.meta.url);
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const QA='nmourao+pfpqa1031@mail.grokbot.com';
const UID='10000000-0000-4000-8000-000000000001';
const request = body => new Request('https://qa.invalid', { method:'POST', body:JSON.stringify(body) });
const auth = isPremium => ({ userId:UID,email:QA,isPremium,isAdmin:false });
const good = () => Response.json({ score:{overall:80},optimizations:[{type:'detailed',content:'A useful prompt'}] });
const database = new PGlite();
await database.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
create table public.profiles(id uuid primary key,current_plan text);
create table public.user_roles(user_id uuid,role text);
insert into auth.users values ('${UID}','${QA}'); insert into profiles values ('${UID}','free');
grant usage on schema public to service_role; grant select on profiles,user_roles to service_role;`);
const migrations=await fs.readdir('supabase/migrations');
await database.exec(await fs.readFile('supabase/migrations/'+migrations.find(n=>n.endsWith('_prompt_optimization_usage.sql')),'utf8'));
async function rpc(name,args) {
  const sql=name==='reserve_prompt_optimization'?'select * from public.reserve_prompt_optimization($1,$2,$3)':'select * from public.finish_prompt_optimization($1,$2,$3,$4)';
  try { const {rows}=await database.query(sql,Object.values(name==='reserve_prompt_optimization' ? { ...args, _is_premium: args._is_premium ?? resolvedPremium } : args));return {data:rows,error:null}; } catch(e){return {data:null,error:e};}
}
let resolvedPremium=false;
async function reset(plan='free') {resolvedPremium=['pro','premium'].includes(plan);await database.exec(`delete from prompt_optimization_usage; delete from prompt_optimization_daily_usage; update profiles set current_plan='${plan}';`);}
const call = operation => withOptimizationQuota({ userId:UID,isPremium:resolvedPremium,prompt:'QA prompt',rpc,headers:{} },operation);

test('actual test-prompts handler rejects Free and Packs before AI, permits Pro/legacy entitlement',async()=>{
  for (const plan of ['free','packs']) {
    let calls=0;
    const handler=await loadEdge('supabase/functions/test-prompts/index.ts',{auth:auth(false),fetch:async()=>{calls++;return good();}});
    const res=await handler(request({promptA:'A',promptB:'B',language:'pt',plan}));
    assert.equal(res.status,403); assert.equal((await res.json()).code,'PRO_REQUIRED'); assert.equal(calls,0);
  }
  let calls=0;
  const handler=await loadEdge('supabase/functions/test-prompts/index.ts',{auth:auth(true),fetch:async()=>{calls++;return Response.json({choices:[{message:{content:'QA response'}}]});}});
  assert.equal((await handler(request({promptA:'A',promptB:'B'}))).status,200);assert.equal(calls,2);
  const unauth=await loadEdge('supabase/functions/test-prompts/index.ts',{auth:new Response(null,{status:401})});
  assert.equal((await unauth(request({}))).status,401);
});
test('Free/Packs: 3 successes across handlers, fourth rejected without AI; Pro unlimited',async()=>{
  for(const plan of ['free','packs','pro','premium']) {
    await reset(plan);let calls=0;
    for(let i=0;i<4;i++){
      const res=await call(async()=>{calls++;return good();});
      assert.equal(res.status,i===3&&['free','packs'].includes(plan)?429:200);
    }
    assert.equal(calls,['free','packs'].includes(plan)?3:4);
  }
});
test('failures, exceptions and malformed results never increment; retries can succeed',async()=>{
  await reset();
  for(const operation of [async()=>new Response(null,{status:429}),async()=>{throw new Error('provider failure');},async()=>Response.json({score:{},optimizations:[]})]) {
    try {await call(operation);} catch{}
    assert.equal((await database.query('select successes,pending_token from prompt_optimization_usage')).rows[0].successes,0);
    assert.equal((await database.query('select pending_token from prompt_optimization_usage')).rows[0].pending_token,null);
  }
  assert.equal((await call(good)).status,200);
});
test('reservation prevents overlapping AI calls; expired lease and stale tokens cannot double count',async()=>{
  await reset();let release; const gate=new Promise(r=>release=r);
  let started;const ready=new Promise(r=>started=r);
  const first=call(async()=>{started();await gate;return good();});await ready;
  const second=await call(()=>{throw new Error('must not reach provider');});assert.equal(second.status,409);
  release();assert.equal((await first).status,200);
  const hash=await promptFingerprint('QA prompt');
  const old=(await rpc('reserve_prompt_optimization',{_user_id:UID,_prompt_hash:hash})).data[0];
  await database.exec("update prompt_optimization_usage set pending_until=now()-interval '1 second'");
  const next=(await rpc('reserve_prompt_optimization',{_user_id:UID,_prompt_hash:hash})).data[0];
  assert.equal((await rpc('finish_prompt_optimization',{_user_id:UID,_prompt_hash:hash,_token:old.token,_success:true})).data[0].committed,false);
  assert.equal((await rpc('finish_prompt_optimization',{_user_id:UID,_prompt_hash:hash,_token:next.token,_success:true})).data[0].used,2);
  assert.equal((await rpc('finish_prompt_optimization',{_user_id:UID,_prompt_hash:hash,_token:next.token,_success:true})).data[0].committed,false);
});
test('quota and counters cannot be reset by client prompt IDs; identity normalization is stable',async()=>{
  assert.equal(await promptFingerprint('  hello\r\nworld  '),await promptFingerprint('hello\nworld'));
  const grants=await database.query("select has_function_privilege('authenticated','public.reserve_prompt_optimization(uuid,text,boolean)','execute') as reserve, has_table_privilege('authenticated','public.prompt_optimization_usage','update') as update");
  assert.equal(grants.rows[0].reserve,false);assert.equal(grants.rows[0].update,false);
  assert.equal((await database.query("select relrowsecurity from pg_class where relname='prompt_optimization_usage'")).rows[0].relrowsecurity,true);
});
test('actual optimize-prompt handler checks quota, validates AI and only then commits',async()=>{
  await reset();let calls=0;
  const handler=await loadEdge('supabase/functions/optimize-prompt/index.ts',{auth:auth(false),rpc,fetch:async()=>{calls++;return Response.json({choices:[{message:{content:JSON.stringify({score:{overall:80},optimizations:[{type:'detailed',content:'QA result'}]})}}]});}});
  for(let i=0;i<4;i++) assert.equal((await handler(request({prompt:'QA prompt',useBrand:false,language:'pt'}))).status,i===3?429:200);
  assert.equal(calls,3);
  const unavailable=await loadEdge('supabase/functions/optimize-prompt/index.ts',{auth:auth(false),rpc:async()=>({error:{},data:null})});
  assert.equal((await unavailable(request({prompt:'QA prompt'}))).status,503);
});


test('integrated optimizer preserves task brand selection and server quota together',async()=>{
  await reset('free');let providerCalls=0;const selections=[];
  const handler=await loadEdge('supabase/functions/optimize-prompt/index.ts',{
    auth:auth(false),rpc,
    resolveBrand:async(userId,selection)=>{assert.equal(userId,UID);selections.push(selection);return null;},
    fetch:async()=>{providerCalls++;return Response.json({choices:[{message:{content:JSON.stringify({score:{overall:80},optimizations:[{type:'detailed',content:'QA integration'}]})}}]});},
  });
  for(let i=0;i<4;i++){
    const response=await handler(request({prompt:'QA prompt',brandId:null,useBrand:false,language:'pt',promptId:'client-'+i}));
    assert.equal(response.status,i===3?429:200);
  }
  assert.equal(providerCalls,3);assert.equal(selections.length,4);
  for(const selection of selections)assert.deepEqual(JSON.parse(JSON.stringify(selection)),{useBrand:false,brandId:null});
});


test('Free/Packs: 20 successes across different prompts; 21st refused without AI; Pro/legacy have no daily cap',async()=>{
  for(const plan of ['free','packs','pro','premium']) {
    await reset(plan);let calls=0;
    for(let i=0;i<21;i++){
      const res=await withOptimizationQuota({userId:UID,isPremium:resolvedPremium,prompt:'Distinct QA prompt '+i,rpc,headers:{}},async()=>{calls++;return good();});
      assert.equal(res.status,i===20&&['free','packs'].includes(plan)?429:200);
      const payload=await res.json();
      if(res.status===429)assert.equal(payload.code,'OPTIMIZATION_DAILY_LIMIT');
      else assert.equal(payload.optimizationUsage.dailyUsed,i+1);
    }
    assert.equal(calls,['free','packs'].includes(plan)?20:21);
  }
});
test('daily reservations cap overlapping distinct prompts, release failures, ignore expired leases and use the Lisbon day',async()=>{
  await reset();const leases=[];
  for(let i=0;i<20;i++){
    const hash=await promptFingerprint('parallel '+i);
    const row=(await rpc('reserve_prompt_optimization',{_user_id:UID,_prompt_hash:hash})).data[0];
    assert.equal(row.allowed,true);assert.equal(row.daily_used,0);assert.equal(row.daily_limit,20);leases.push({hash,...row});
  }
  const blocked=(await rpc('reserve_prompt_optimization',{_user_id:UID,_prompt_hash:await promptFingerprint('parallel overflow')})).data[0];
  assert.equal(blocked.allowed,false);assert.equal(blocked.reason,'DAILY_BUSY');
  const first=leases[0];
  assert.equal((await rpc('finish_prompt_optimization',{_user_id:UID,_prompt_hash:first.hash,_token:first.token,_success:false})).data[0].daily_used,0);
  const retry=(await rpc('reserve_prompt_optimization',{_user_id:UID,_prompt_hash:await promptFingerprint('retry')})).data[0];assert.equal(retry.allowed,true);
  await database.exec("update prompt_optimization_usage set pending_until=clock_timestamp()-interval '1 second' where pending_token is not null");
  const expired=(await rpc('reserve_prompt_optimization',{_user_id:UID,_prompt_hash:await promptFingerprint('after expiry')})).data[0];assert.equal(expired.allowed,true);
  const dates=(await database.query("select (clock_timestamp() at time zone 'Europe/Lisbon')::date::text as day, (((clock_timestamp() at time zone 'Europe/Lisbon')::date+1)::timestamp at time zone 'Europe/Lisbon') as resets")).rows[0];
  assert.equal(expired.quota_day.toISOString?.().slice(0,10)??expired.quota_day,dates.day);
  assert.equal(new Date(expired.resets_at).getTime(),new Date(dates.resets).getTime());
  // A previous Lisbon day's full allowance does not consume today's allowance.
  await reset();await database.query("insert into prompt_optimization_daily_usage values ($1,(clock_timestamp() at time zone 'Europe/Lisbon')::date-1,20)",[UID]);
  assert.equal((await call(good)).status,200);
  // At the last daily slot, concurrent calls to DIFFERENT prompts cannot both reach AI.
  await reset();await database.query("insert into prompt_optimization_daily_usage values ($1,(clock_timestamp() at time zone 'Europe/Lisbon')::date,19)",[UID]);
  let release,started;const gate=new Promise(r=>release=r);const ready=new Promise(r=>started=r);
  const inFlight=withOptimizationQuota({userId:UID,isPremium:resolvedPremium,prompt:'final slot',rpc,headers:{}},async()=>{started();await gate;return good();});await ready;
  const other=await withOptimizationQuota({userId:UID,isPremium:resolvedPremium,prompt:'different final slot',rpc,headers:{}},()=>{throw new Error('Daily cap bypassed');});assert.equal(other.status,409);
  release();const last=await inFlight;assert.equal((await last.json()).optimizationUsage.dailyUsed,20);
});
test('daily renewal does not reset the lifetime per-prompt limit',async()=>{
  await reset();for(let i=0;i<3;i++)assert.equal((await call(good)).status,200);
  await database.exec("update prompt_optimization_daily_usage set day=day-1");
  const same=await call(()=>{throw new Error('Per-prompt cap bypassed after renewal');});assert.equal(same.status,429);
  assert.equal((await same.json()).code,'OPTIMIZATION_LIMIT');
  const fresh=await withOptimizationQuota({userId:UID,isPremium:resolvedPremium,prompt:'New day, new prompt',rpc,headers:{}},good);assert.equal(fresh.status,200);
  assert.equal((await fresh.json()).optimizationUsage.dailyUsed,1);
});


function entitlementClient({plan='free',override=null,roles=[],fail=false}={}) {
  return () => ({rpc,auth:{getUser:async()=>({data:{user:{id:UID,email:QA}},error:null})},from:(table)=>{
    const filters={};
    const result=()=>({data:table==='profiles'?{current_plan:plan}:table==='user_roles'?roles:override,error:fail?new Error('lookup unavailable'):null});
    const builder={select:()=>builder,eq:(key,value)=>{filters[key]=value;assert.equal(value,UID);return builder;},maybeSingle:async()=>result(),then:(ok,no)=>Promise.resolve(result()).then(ok,no)};
    return builder;
  }});
}
test('real auth helper honors active Pro/Premium overrides, ignores expired overrides, and fails closed on lookup errors',async()=>{
  for(const [override,expected] of [[{plan:'pro',expires_at:null},true],[{plan:'pro',expires_at:'2099-01-01T00:00:00Z'},true],[{plan:'premium',expires_at:null},true],[{plan:'pro',expires_at:'2000-01-01T00:00:00Z'},false],[{plan:'packs',expires_at:null},false]]) {
    const exports=await loadEdge('supabase/functions/_shared/auth.ts',{realAuth:true,exportedModule:true,clientFactory:entitlementClient({override})});
    const result=await exports.authenticateRequest(new Request('https://qa.invalid',{headers:{Authorization:'Bearer LOCAL_QA_FAKE'}}));
    assert.equal(result.isPremium,expected);
  }
  const unavailable=await loadEdge('supabase/functions/_shared/auth.ts',{realAuth:true,exportedModule:true,clientFactory:entitlementClient({fail:true})});
  assert.equal((await unavailable.authenticateRequest(new Request('https://qa.invalid',{headers:{Authorization:'Bearer LOCAL_QA_FAKE'}}))).status,503);
});
test('override Pro passes real auth through optimizer into SQL, with no prompt/day cap and no client-supplied entitlement',async()=>{
  await reset('free');const transmitted=[];
  const captureRpc=async(name,args)=>{if(name==='reserve_prompt_optimization')transmitted.push(args._is_premium);return rpc(name,args);};
  const factory=entitlementClient({override:{plan:'pro',expires_at:null}});
  const handler=await loadEdge('supabase/functions/optimize-prompt/index.ts',{realAuth:true,clientFactory:()=>({...factory(),rpc:captureRpc}),fetch:async()=>Response.json({choices:[{message:{content:JSON.stringify({score:{overall:80},optimizations:[{type:'detailed',content:'QA override result'}]})}}]})});
  for(let i=0;i<21;i++) {
    const res=await handler(new Request('https://qa.invalid',{method:'POST',headers:{Authorization:'Bearer LOCAL_QA_FAKE'},body:JSON.stringify({prompt:'QA override prompt',brandId:null,useBrand:false,isPremium:false})}));
    assert.equal(res.status,200);const usage=(await res.json()).optimizationUsage;
    assert.equal(usage.limit,null);assert.equal(usage.dailyLimit,null);assert.equal(usage.dailyUsed,i+1);
  }
  assert.ok(transmitted.every(value=>value===true));
  // Free cannot set the service-role RPC argument via the HTTP body.
  await reset('free');
  const freeHandler=await loadEdge('supabase/functions/optimize-prompt/index.ts',{realAuth:true,clientFactory:entitlementClient(),fetch:async()=>Response.json({choices:[{message:{content:JSON.stringify({score:{overall:80},optimizations:[{type:'detailed',content:'QA free result'}]})}}]})});
  for(let i=0;i<4;i++) assert.equal((await freeHandler(new Request('https://qa.invalid',{method:'POST',headers:{Authorization:'Bearer LOCAL_QA_FAKE'},body:JSON.stringify({prompt:'QA free prompt',useBrand:false,isPremium:true,_is_premium:true})}))).status,i===3?429:200);
});
test.after(async()=>database.close());
