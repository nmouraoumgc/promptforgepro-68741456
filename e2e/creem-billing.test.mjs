import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { loadEdge } from './helpers/edgeHarness.mjs';

const env = {
  CREEM_MODE:'test', CREEM_API_KEY:'local-test', CREEM_WEBHOOK_SECRET:'local-signing',
  CREEM_PRO_ANNUAL_ID:'prod_annual', CREEM_PRO_MONTHLY_ID:'prod_monthly',
  CREEM_CHECKOUT_ENABLED:'true', CREEM_SITE_ORIGIN:'https://qa.invalid',
};
const user = {id:'10000000-0000-4000-8000-000000000001',email:'qa@example.test',email_confirmed_at:'2026-01-01'};
const rpc = async (db, name, args) => {
  const values = Object.values(args);
  const params = values.map((_, i) => '$'+(i+1)).join(',');
  try {
    const {rows} = await db.query('select public.'+name+'('+params+') as result',values);
    return {data:rows[0].result,error:null};
  } catch (error) { return {data:null,error}; }
};
const readMigration = name => readFile('supabase/migrations/'+name,'utf8');

for (const billing of ['monthly','annual']) {
  test(billing + ' from authenticated checkout to payment failure, signed payment, renewal, cancellation and expiry', async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema auth; create table auth.users(id uuid primary key);
        create function auth.uid() returns uuid language sql as $$select null::uuid$$;
        create function auth.role() returns text language sql as $$select 'service_role'::text$$;
        create schema cron;
        create table cron.jobs(name text, schedule text, command text);
        create function cron.schedule(text,text,text) returns int language sql as $$
          insert into cron.jobs values ($1,$2,$3) returning 1
        $$;
        create type plan_type as enum ('free','pro','premium','packs');
        create table profiles(id uuid primary key,current_plan plan_type,updated_at timestamptz);
        create table purchases(user_id uuid,plan plan_type,status text);
        create table plan_overrides(user_id uuid,plan plan_type,expires_at timestamptz);
        create table payment_failures(user_id uuid,ip_hash text,source text,created_at timestamptz);
        create table checkout_events(user_id uuid,event_name text,created_at timestamptz);
        create table checkout_attempts(id uuid primary key default gen_random_uuid(),user_id uuid,email text,ip_hash text,
          price_id text,discount_code text,status text default 'initiated',created_at timestamptz default now(),updated_at timestamptz);
        create function is_disposable_email(text) returns boolean language sql as $$select false$$;
      `);
      await db.exec(await readMigration('20260430081854_f77cda12-8028-4bc4-8406-678f8702edff.sql'));
      const plans = await readMigration('20261030230100_packs_entitlements.sql');
      await db.exec(plans.slice(plans.indexOf('create or replace function public.recompute_profile_plan'),plans.indexOf('drop trigger if exists trg_sync_plan_from_override')));
      await db.exec('create trigger plan after insert or update on subscriptions for each row execute function sync_profile_plan_from_subscription()');
      await db.exec(await readMigration('20261122120000_creem_pro.sql'));
      await db.query('insert into auth.users values ($1)',[user.id]);
      await db.query("insert into profiles values ($1,'free',now())",[user.id]);

      const product = 'prod_'+billing;
      let checkoutBody;
      const sub = {id:'sub_test',customer:'cust_test',product,status:'active',current_period_end_date:'2099-02-01'};
      const client = {
        auth:{getUser:async () => ({data:{user}})},
        rpc:(name,args) => rpc(db,name,args),
        from(table) {
          assert.equal(table,'creem_checkouts');
          return {update: data => ({eq: (field, id) => ({select: () => ({single:async () => {
            assert.equal(field,'attempt_id');
            await db.query('update creem_checkouts set checkout_id=$1,checkout_url=$2 where attempt_id=$3',[data.checkout_id,data.checkout_url,id]);
            return {error:null};
          }})})})};
        },
      };
      const transport = async (url,init) => {
        const {origin,pathname} = new URL(url);
        assert.equal(origin,'https://test-api.creem.io');
        if (pathname === '/v1/products') return Response.json({id:product,price:billing==='annual'?9000:900,currency:'EUR',billing_type:'recurring',billing_period:billing==='annual'?'every-year':'every-month'});
        if (pathname === '/v1/discounts') return Response.json({code:'PRODUCTHUNT20',status:'active',type:'percentage',duration:'once',percentage:20,applies_to_products:[product]});
        if (pathname === '/v1/subscriptions') return Response.json(sub);
        assert.equal(pathname,'/v1/checkouts');
        checkoutBody = JSON.parse(init.body);
        return Response.json({id:'ch_test',checkout_url:'https://checkout.creem.io/ch_test'});
      };
      const options = {env,clientFactory:()=>client,fetch:transport};
      const checkout = await loadEdge('supabase/functions/creem-checkout/index.ts',options);
      const webhook = await loadEdge('supabase/functions/creem-webhook/index.ts',options);
      const buy = headers => checkout(new Request('https://qa.invalid',{method:'POST',
        headers:{'x-forwarded-for':'192.0.2.1',...headers},body:JSON.stringify({billing,discountCode:'PRODUCTHUNT20',product_id:'untrusted',userId:'ignored'})}));
      assert.equal((await buy({})).status,401);
      const session = await (await buy({authorization:'Bearer test'})).json();
      assert.equal(session.url,'https://checkout.creem.io/ch_test');
      assert.equal(checkoutBody.product_id,product);
      assert.equal(checkoutBody.discount_code,'PRODUCTHUNT20');
      assert.deepEqual(checkoutBody.customer,{email:user.email});
      assert.deepEqual(await (await buy({authorization:'Bearer test'})).json(),session);
      const plan = async () => (await db.query('select current_plan from profiles')).rows[0].current_plan;
      assert.equal(await plan(),'free');
      const notify = async (type,obj,time,secret=env.CREEM_WEBHOOK_SECRET) => {
        const body = JSON.stringify({eventType:type,created_at:time,object:obj});
        const signature = createHmac('sha256',secret).update(body).digest('hex');
        return (await webhook(new Request('https://qa.invalid',{method:'POST',body,headers:{'creem-signature':signature}}))).status;
      };
      const event = {id:'ch_test',product,mode:'test',status:'completed',order:{status:'paid'},request_id:checkoutBody.request_id,subscription:sub.id};
      assert.equal(await notify('checkout.completed',event,1,'wrong-secret'),401);
      assert.equal(await notify('subscription.paid',sub,2),503);
      assert.equal(await notify('checkout.completed',{...event,mode:'prod'},1),400);
      assert.equal(await notify('checkout.completed',{...event,order:{status:'failed'}},1),204);
      assert.equal(await plan(),'free');
      assert.equal((await db.query('select count(*)::int as count from subscriptions')).rows[0].count,0);
      assert.equal(await notify('checkout.completed',event,1),204);
      assert.equal(await plan(),'pro');
      assert.equal(await notify('checkout.completed',event,1),204);
      sub.current_period_end_date='2099-03-01';
      assert.equal(await notify('subscription.paid',sub,2),204);
      const subscription = async () => {
        const {rows} = await db.query(`select status, cancel_at_period_end,
          to_char(current_period_end at time zone 'UTC','YYYY-MM-DD') as paid_through
          from subscriptions`);
        assert.equal(rows.length,1);
        return rows[0];
      };
      assert.equal((await subscription()).paid_through,'2099-03-01');
      sub.status='past_due';
      assert.equal(await notify('subscription.past_due',sub,3),204);
      assert.equal((await subscription()).status,'past_due');
      assert.equal((await subscription()).paid_through,'2099-03-01');
      assert.equal(await plan(),'pro');
      sub.status='scheduled_cancel';
      assert.equal(await notify('subscription.scheduled_cancel',sub,4),204);
      assert.equal((await subscription()).cancel_at_period_end,true);
      assert.equal(await plan(),'pro');
      sub.status='canceled';
      assert.equal(await notify('subscription.canceled',sub,5),204);
      assert.equal(await plan(),'pro');
      const {rows:[job]} = await db.query("select * from cron.jobs where name='expire-creem-pro'");
      assert.equal(job.schedule,'*/5 * * * *');
      await db.exec(job.command);
      assert.equal(await plan(),'pro');
      sub.current_period_end_date='2000-01-01';
      assert.equal(await notify('subscription.canceled',sub,6),204);
      await db.exec(job.command);
      assert.equal((await subscription()).status,'expired');
      assert.equal(await plan(),'free');
      sub.status='expired';
      assert.equal(await notify('subscription.expired',sub,7),204);
      sub.status='active';
      sub.current_period_end_date='2099-03-01';
      assert.equal(await notify('subscription.paid',sub,2),204);
      assert.equal(await plan(),'free');
      assert.deepEqual(await (await buy({authorization:'Bearer test'})).json(),{reason:'code_already_used'});
    } finally { await db.close(); }
  });
}

test('the hosted QA project rejects Live mode before making a provider request', async () => {
  const { creemRequest } = await loadEdge('supabase/functions/_shared/creem.ts', {
    env: {...env, CREEM_MODE:'live', SUPABASE_URL:'https://nzhjzdmuevwsaldpqlxd.supabase.co'},
    exportedModule:true,
    fetch: () => assert.fail('QA must never contact the Live API'),
  });
  await assert.rejects(creemRequest('subscriptions?subscription_id=sub_test'), /QA requires Creem test mode/);
});
