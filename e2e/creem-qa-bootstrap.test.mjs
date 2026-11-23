import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';

const user = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';

async function partialQa(db) {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text not null);
    create function auth.uid() returns uuid language sql as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql as $$select current_user::text$$;
    create type public.plan_type as enum ('free','pro','premium');
    create type public.app_role as enum ('admin','user');
    create table public.profiles(id uuid primary key references auth.users, email text not null,
      current_plan public.plan_type not null default 'free', updated_at timestamptz default now());
    alter table public.profiles enable row level security;
    create policy own_profile on public.profiles to authenticated
      using (auth.uid() = id) with check (auth.uid() = id);
    grant usage on schema auth to authenticated;
    grant select, update, insert on public.profiles to authenticated;
    create table public.user_roles(user_id uuid, role public.app_role);
    create table public.learn_lesson_content(id uuid);
    create table public.learn_lessons(id uuid);
    create table public.learn_progress(id uuid);
  `);
}

function sql() {
  return execFileSync(process.execPath, ['scripts/creem-qa/build-bootstrap.mjs'], {
    encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
  });
}

test('QA bootstrap rejects a different schema before creating billing objects', async () => {
  const db = new PGlite();
  try {
    await partialQa(db);
    await db.exec('create table public.extra_table(id uuid)');
    await assert.rejects(db.exec(sql()), /QA bootstrap refused/);
    await db.exec('rollback');
    const { rows } = await db.query("select to_regclass('public.subscriptions') as billing");
    assert.equal(rows[0].billing, null);
  } finally {
    await db.close();
  }
});

test('QA bootstrap can be reapplied and uses the real billing schema, grants and triggers', async () => {
  const db = new PGlite();
  try {
    await partialQa(db);
    const bootstrap = sql();
    assert.doesNotMatch(bootstrap, /cron\.schedule|net\.http|https?:\/\//i);
    await db.exec(bootstrap);
    await db.exec(bootstrap);
    await db.query('insert into auth.users values ($1,$2),($3,$4)', [user, 'buyer@example.test', other, 'other@example.test']);
    const { rows: [roles] } = await db.query(`
      select has_function_privilege('authenticated','public.reserve_creem_checkout(uuid,text,text,text,text,text,text)','execute') as can_reserve,
             has_function_privilege('anon','public.apply_creem_subscription(uuid,text,text,text,text,text,bigint,text,timestamptz,timestamptz,boolean)','execute') as can_apply,
             has_table_privilege('authenticated','public.creem_checkouts','select') as can_read_binding
    `);
    assert.deepEqual(roles, {can_reserve: false, can_apply: false, can_read_binding: false});
    const { rows: [domain] } = await db.query("select public.is_disposable_email('qa@child.mailinator.com') as blocked");
    assert.equal(domain.blocked, true);
    await db.exec('set role service_role');
    const { rows } = await db.query(`select public.reserve_creem_checkout(
      $1,'buyer@example.test',repeat('a',64),'pro_monthly','prod_monthly','sandbox',null
    ) as reservation`, [user]);
    const attempt = rows[0].reservation.attempt;
    assert.ok(attempt);
    await assert.rejects(db.query(`select public.reserve_creem_checkout(
      $1,'other@example.test',repeat('a',64),'pro_monthly','prod_monthly','live',null
    )`, [other]), {code:'23514'});
    await db.query("update creem_checkouts set checkout_id='ch_qa' where attempt_id=$1", [attempt]);
    const apply = (product, environment) => db.query(`select public.apply_creem_subscription(
      $1,'ch_qa','sub_qa','cust_qa',$2,$3,1,'active',now(),now()+interval '30 days',false
    )`, [attempt, product, environment]);
    await assert.rejects(apply('wrong_product', 'sandbox'), /Product or environment mismatch/);
    await apply('prod_monthly','sandbox');
    await apply('prod_monthly','sandbox');
    await db.exec('reset role');
    const { rows: [plan] } = await db.query('select current_plan from profiles where id=$1', [user]);
    assert.equal(plan.current_plan, 'pro');
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
    assert.equal((await db.query('select * from subscriptions')).rows.length, 0);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
    assert.equal((await db.query('select * from subscriptions')).rows.length, 1);
    await assert.rejects(db.query("update profiles set current_plan='premium'"), {code:'42501'});
    await assert.rejects(db.query("insert into profiles(id,email,current_plan) values ($1,'other@example.test','premium')", [other]), {code:'42501'});
    await db.query("update profiles set display_name='Sandbox user'");
    await assert.rejects(db.query("update subscriptions set status='active'"), {code:'42501'});
    await db.exec('reset role');
    await db.exec(bootstrap);
    assert.equal((await db.query('select * from subscriptions')).rows.length, 1);

    const expire = readFileSync('scripts/creem-qa/expire-subscriptions.sql', 'utf8');
    await db.exec(expire);
    assert.equal((await db.query('select status from subscriptions')).rows[0].status, 'active');
    await db.exec("update subscriptions set current_period_end = now() - interval '1 second'");
    await db.exec(expire);
    await db.exec(expire);
    assert.equal((await db.query('select status from subscriptions')).rows[0].status, 'expired');
    assert.equal((await db.query('select current_plan from profiles where id=$1', [user])).rows[0].current_plan, 'free');
  } finally {
    await db.close();
  }
});
