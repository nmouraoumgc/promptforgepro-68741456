import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const migration = name => readFileSync('supabase/migrations/'+name,'utf8');

test('Live migrations preserve 44 Paddle rows and paid rights across Creem cancellation and expiry', async () => {
 const db = new PGlite();
 try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select null::uuid$$;
    create function auth.role() returns text language sql as $$select current_user::text$$;
    create schema cron; create table cron.jobs(name text primary key, schedule text, command text);
    create function cron.schedule(text,text,text) returns int language sql as $$
      insert into cron.jobs values($1,$2,$3) on conflict(name) do update set command=excluded.command returning 1
    $$;
    create type plan_type as enum ('free','pro','premium','packs');
    create table profiles(id uuid primary key,current_plan plan_type,updated_at timestamptz);
    create table purchases(user_id uuid,plan plan_type,status text);
    create table plan_overrides(user_id uuid,plan plan_type,expires_at timestamptz);
    create table checkout_attempts(id uuid primary key default gen_random_uuid(),user_id uuid,email text,
      ip_hash text,price_id text,discount_code text,status text default 'initiated',created_at timestamptz default now(),updated_at timestamptz);
    create table checkout_events(user_id uuid,event_name text,created_at timestamptz);
    create table payment_failures(user_id uuid,ip_hash text,source text,created_at timestamptz);
    create function is_disposable_email(text) returns boolean language sql as $$select false$$;
  `);
  await db.exec(migration('20260430081854_f77cda12-8028-4bc4-8406-678f8702edff.sql'));
  const plans=migration('20261030230100_packs_entitlements.sql');
  await db.exec(plans.slice(plans.indexOf('create or replace function public.recompute_profile_plan'),plans.indexOf('drop trigger if exists trg_sync_plan_from_override')));
  await db.exec(`
    create trigger plan after insert or update on subscriptions for each row execute function sync_profile_plan_from_subscription();
    insert into auth.users select md5(i::text)::uuid from generate_series(1,44) i;
    insert into profiles select id,'free',now() from auth.users;
    insert into subscriptions(user_id,paddle_subscription_id,paddle_customer_id,product_id,price_id,status,current_period_end,environment)
      select md5(i::text)::uuid,'sub_paddle_'||i,'cust_'||i,'prod_legacy','pro_monthly',
      case when i<=38 then 'active' else 'canceled' end,
      case when i<=38 then now()+interval '30 days' else now()-interval '1 day' end,'live'
      from generate_series(1,44) i;
  `);
  const before=(await db.query('select * from subscriptions order by paddle_subscription_id')).rows;
  for(const name of ['20261122120000_creem_pro.sql','20261123160000_creem_serial_sync.sql','20261123170000_creem_paid_source_checkout_guard.sql','20261123180000_billing_plan_serialization.sql']) await db.exec(migration(name));
  const after=(await db.query('select id,user_id,paddle_subscription_id,paddle_customer_id,product_id,price_id,status,current_period_start,current_period_end,cancel_at_period_end,environment,created_at,updated_at from subscriptions order by paddle_subscription_id')).rows;
  assert.deepEqual(after,before);
  assert.equal((await db.query("select count(*)::int n from profiles where current_plan='pro'")).rows[0].n,38);
  const user=(await db.query("select id from profiles where current_plan='pro' limit 1")).rows[0].id;
  await db.query("update profiles set current_plan='free' where id=$1",[user]);
  const reserved=await db.query("select reserve_creem_checkout($1,'buyer@example.test','hash','pro_monthly','creem_product','live',null) r",[user]);
  assert.equal(reserved.rows[0].r.reason,'already_subscribed');
  const attempt=(await db.query("insert into checkout_attempts(user_id,price_id) values($1,'pro_monthly') returning id",[user])).rows[0].id;
  await db.query("insert into creem_checkouts values($1,'creem_product','live','checkout_live',null,null)",[attempt]);
  const token=(await db.query("select acquire_creem_sync('creem_sub') t")).rows[0].t;
  await db.query("select commit_creem_sync($1,$2,'checkout_live','creem_sub','creem_customer','creem_product','live','expired',now(),now()+interval '30 days',false)",[token,attempt]);
  assert.equal((await db.query('select current_plan from profiles where id=$1',[user])).rows[0].current_plan,'pro');
  const job=(await db.query("select command from cron.jobs where name='expire-creem-pro'")).rows[0].command;
  await db.exec(job);
  assert.deepEqual((await db.query('select id,user_id,paddle_subscription_id,paddle_customer_id,product_id,price_id,status,current_period_start,current_period_end,cancel_at_period_end,environment,created_at,updated_at from subscriptions where paddle_subscription_id is not null order by paddle_subscription_id')).rows,before);
  assert.equal((await db.query('select count(*)::int n from creem_sync_leases')).rows[0].n,0);
  const freeUser=(await db.query("select id from profiles where current_plan='free' limit 1")).rows[0].id;
  const reserve=async (product,code=null)=> (await db.query(
    "select reserve_creem_checkout($1,'free@example.test','another_hash','pro_monthly',$2,'live',$3) r",
    [freeUser,product,code])).rows[0].r;
  const open=await reserve('monthly');
  assert.ok(open.attempt);
  await db.query("update creem_checkouts set checkout_id='open_link',checkout_url='https://checkout.creem.io/open' where attempt_id=$1",[open.attempt]);
  await db.query("update checkout_attempts set created_at=now()-interval '2 hours' where id=$1",[open.attempt]);
  assert.deepEqual(await reserve('monthly'),{existing:true,url:'https://checkout.creem.io/open'});
  assert.equal((await reserve('annual')).reason,'checkout_unavailable');
  assert.equal((await reserve('monthly','PRODUCTHUNT20')).reason,'checkout_unavailable');
  await db.query("update checkout_attempts set status='abandoned' where id=$1",[open.attempt]);
  assert.equal((await reserve('monthly')).reason,'checkout_unavailable');

  assert.equal((await db.query("select has_function_privilege('service_role','apply_creem_subscription(uuid,text,text,text,text,text,bigint,text,timestamptz,timestamptz,boolean)','execute') allowed")).rows[0].allowed,false);
 } finally {await db.close();}
});
