// Paddle transition (27/11/2026): 48h grace expiry job, Creem checkout after grace with PADDLE50,
// and the manual PADDLE_TRANSITION notice. Offline: PGlite + the real Edge handlers, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { loadEdge } from './helpers/edgeHarness.mjs';

const migration = name => readFile('supabase/migrations/' + name, 'utf8');
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const GRACE = '20261127130000_paddle_grace_expiry.sql';

async function setupDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select null::uuid$$;
    create function auth.role() returns text language sql as $$select current_user::text$$;
    create schema cron;
    create table cron.job(jobid bigint generated always as identity, jobname text unique, schedule text, command text);
    create function cron.schedule(text,text,text) returns bigint language sql as $$
      insert into cron.job(jobname,schedule,command) values ($1,$2,$3) returning jobid $$;
    create function cron.unschedule(text) returns boolean language sql as $$
      delete from cron.job where jobname=$1 returning true $$;
    create view cron.jobs as select jobname as name, schedule, command from cron.job;
    create type plan_type as enum ('free','pro','premium','packs');
    create table profiles(id uuid primary key, current_plan plan_type, updated_at timestamptz);
    create table purchases(user_id uuid, plan plan_type, status text);
    create table plan_overrides(user_id uuid, plan plan_type, expires_at timestamptz);
    create table checkout_attempts(id uuid primary key default gen_random_uuid(), user_id uuid, email text, ip_hash text,
      price_id text, discount_code text, status text default 'initiated', created_at timestamptz default now(), updated_at timestamptz);
    create table checkout_events(user_id uuid, event_name text, created_at timestamptz);
    create table payment_failures(user_id uuid, ip_hash text, source text, created_at timestamptz);
    create function is_disposable_email(text) returns boolean language sql as $$select false$$;
  `);
  await db.exec(await migration('20260430081854_f77cda12-8028-4bc4-8406-678f8702edff.sql'));
  const plans = await migration('20261030230100_packs_entitlements.sql');
  await db.exec(plans.slice(plans.indexOf('create or replace function public.recompute_profile_plan'), plans.indexOf('drop trigger if exists trg_sync_plan_from_override')));
  await db.exec('create trigger plan after insert or update on subscriptions for each row execute function sync_profile_plan_from_subscription()');
  for (const name of ['20261122120000_creem_pro.sql', '20261123160000_creem_serial_sync.sql', '20261123170000_creem_paid_source_checkout_guard.sql',
    '20261123180000_billing_plan_serialization.sql', '20261124111500_allow_creem_billing_period_switch.sql']) await db.exec(await migration(name));
  return db;
}
async function addUser(db, n, plan = 'pro') {
  await db.query('insert into auth.users values ($1)', [id(n)]);
  await db.query('insert into profiles values ($1,$2,now())', [id(n), plan]);
}
async function addPaddle(db, n, status, endSql) {
  await db.query(`insert into subscriptions(user_id,paddle_subscription_id,paddle_customer_id,product_id,price_id,status,current_period_start,current_period_end,environment)
    values ($1,$2,$3,'pro_plan','pro_monthly',$4,now()-interval '30 days',${endSql},'live')`, [id(n), 'sub_p' + n, 'ctm_' + n, status]);
}
const plan = async (db, n) => (await db.query('select current_plan from profiles where id=$1', [id(n)])).rows[0].current_plan;
const status = async (db, n) => (await db.query('select status from subscriptions where user_id=$1 and paddle_subscription_id is not null', [id(n)])).rows[0].status;
// Webhooks stopped, so the cached plan is stale: force 'pro' as production has it.
const stale = async (db, ns) => db.query("update profiles set current_plan='pro' where id = any($1::uuid[])", [ns.map(id)]);

test('grace job: 48h after period end, Paddle access expires once; overrides, Creem and grace keep Pro; rollback restores', async () => {
  const db = await setupDb();
  try {
    for (const n of [1, 2, 3, 4, 5, 6]) await addUser(db, n);
    await addPaddle(db, 1, 'active', "now()-interval '49 hours'");
    await addPaddle(db, 2, 'active', "now()-interval '47 hours'");
    await addPaddle(db, 3, 'active', "now()-interval '49 hours'");
    await db.query("insert into plan_overrides values ($1,'pro',now()+interval '30 days')", [id(3)]);
    await addPaddle(db, 4, 'canceled', "now()-interval '120 days'");
    await addPaddle(db, 5, 'paused', "now()-interval '49 hours'");
    await addPaddle(db, 6, 'active', "now()-interval '49 hours'");
    await db.query(`insert into subscriptions(user_id,creem_subscription_id,creem_customer_id,product_id,price_id,status,current_period_end,environment)
      values ($1,'sub_creem6','cust_c6','prod_monthly','pro_monthly','active',now()+interval '20 days','live')`, [id(6)]);
    await stale(db, [1, 2, 3, 5, 6]);
    const before = (await db.query('select id,status,updated_at from subscriptions order by id')).rows;

    await db.exec(await migration(GRACE));
    // Applying the migration registers the job only; nothing changes yet.
    assert.deepEqual((await db.query('select id,status,updated_at from subscriptions order by id')).rows, before);
    assert.equal(await plan(db, 1), 'pro');
    const jobs = (await db.query("select * from cron.job where jobname='expire-paddle-grace'")).rows;
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].schedule, '*/15 * * * *');
    await assert.rejects(async () => db.exec(await migration(GRACE)), /already exists/);

    // Single-user call (used by creem-checkout) touches only that user.
    assert.equal((await db.query('select expire_paddle_grace($1) n', [id(5)])).rows[0].n, 1);
    assert.equal(await status(db, 1), 'active');
    assert.equal(await status(db, 5), 'expired');
    assert.equal(await plan(db, 5), 'free');

    await db.exec(jobs[0].command);
    assert.equal(await status(db, 1), 'expired'); assert.equal(await plan(db, 1), 'free');
    assert.equal(await status(db, 2), 'active');  assert.equal(await plan(db, 2), 'pro');   // still in grace
    assert.equal(await status(db, 3), 'expired'); assert.equal(await plan(db, 3), 'pro');   // active override wins
    assert.equal(await status(db, 4), 'canceled');                                          // historical row untouched
    assert.equal(await status(db, 6), 'expired'); assert.equal(await plan(db, 6), 'pro');   // Creem subscription keeps Pro
    assert.equal((await db.query("select status from subscriptions where creem_subscription_id='sub_creem6'")).rows[0].status, 'active');
    const audit = (await db.query('select previous_status from paddle_grace_expirations order by user_id')).rows.map(r => r.previous_status);
    assert.deepEqual(audit, ['active', 'active', 'paused', 'active']);

    // Idempotent.
    assert.equal((await db.query('select expire_paddle_grace(null) n')).rows[0].n, 0);

    // Documented rollback restores statuses and rights.
    const sql = await migration(GRACE);
    const block = sql.slice(sql.indexOf('-- Rollback'), sql.indexOf('do $preflight$')).split('\n')
      .filter(l => l.startsWith('--   ') && !l.includes('optional') && !l.includes('the subscriptions trigger')).map(l => l.slice(5)).join('\n');
    await db.exec(block);
    assert.equal(await status(db, 1), 'active'); assert.equal(await status(db, 5), 'paused');
    assert.equal(await plan(db, 1), 'free'); // recompute is date-based: period ended, so still Free (no stale cache)
    assert.equal((await db.query("select count(*)::int n from cron.job where jobname='expire-paddle-grace'")).rows[0].n, 0);
  } finally { await db.close(); }
});

const env = {
  SUPABASE_URL: 'https://nzhjzdmuevwsaldpqlxd.supabase.co', CREEM_MODE: 'test', CREEM_API_KEY: 'local-test',
  CREEM_PRO_ANNUAL_ID: 'prod_annual', CREEM_PRO_MONTHLY_ID: 'prod_monthly', CREEM_PACKS_ID: 'prod_packs',
  CREEM_CHECKOUT_ENABLED: 'true', CREEM_SITE_ORIGIN: 'https://qa.invalid',
};
function checkoutClient(db, userN, calls) {
  const user = { id: id(userN), email: `qa${userN}@example.test`, email_confirmed_at: '2026-01-01' };
  return {
    auth: { getUser: async () => ({ data: { user } }) },
    rpc: async (name, args) => {
      calls.push(name);
      const values = Object.values(args);
      try {
        const { rows } = await db.query('select public.' + name + '(' + values.map((_, i) => '$' + (i + 1)).join(',') + ') as result', values);
        return { data: rows[0].result, error: null };
      } catch (error) { return { data: null, error }; }
    },
    from(table) {
      if (table === 'subscriptions') {
        const f = {};
        const q = { select: () => q, eq: (k, v) => { f[k] = v; return q; }, not: () => q,
          limit: async () => ({ data: (await db.query('select id from subscriptions where user_id=$1 and paddle_subscription_id is not null', [f.user_id])).rows, error: null }) };
        return q;
      }
      if (table === 'profiles') {
        const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: (await db.query('select current_plan from profiles where id=$1', [user.id])).rows[0], error: null }) };
        return q;
      }
      if (table === 'checkout_attempts') return { update: data => ({ eq: async (field, aid) => {
        await db.query('update checkout_attempts set status=$1 where id=$2', [data.status, aid]); return { error: null }; } }) };
      assert.equal(table, 'creem_checkouts');
      return { update: data => ({ eq: (field, aid) => ({ select: () => ({ single: async () => {
        await db.query('update creem_checkouts set checkout_id=$1,checkout_url=$2 where attempt_id=$3', [data.checkout_id, data.checkout_url, aid]);
        return { error: null };
      } }) }) }) };
    },
  };
}
let checkoutSeq = 0;
function transport(seen, percentage = 50) {
  return async (url, init) => {
    const { pathname, searchParams } = new URL(url);
    if (pathname === '/v1/products/prod_monthly') return Response.json({ id: 'prod_monthly', price: 900, currency: 'EUR', billing_type: 'recurring', billing_period: 'every-month' });
    if (pathname === '/v1/products/prod_annual') return Response.json({ id: 'prod_annual', price: 9000, currency: 'EUR', billing_type: 'recurring', billing_period: 'every-year' });
    if (pathname === '/v1/discounts') return Response.json({ code: searchParams.get('discount_code'), status: 'active', type: 'percentage', duration: 'once', percentage, applies_to_products: ['prod_monthly'] });
    assert.equal(pathname, '/v1/checkouts');
    seen.push(JSON.parse(init.body));
    checkoutSeq++;
    return Response.json({ id: 'ch_' + checkoutSeq, checkout_url: 'https://checkout.creem.io/ch_' + checkoutSeq });
  };
}
const buy = (handler, body, ip = '192.0.2.1') => handler(new Request('https://qa.invalid', { method: 'POST',
  headers: { authorization: 'Bearer t', 'x-forwarded-for': ip }, body: JSON.stringify(body) })).then(r => r.json());

test('creem-checkout: stale Paddle Pro after grace can buy with PADDLE50; in grace, Creem owners and other codes are refused', async () => {
  const db = await setupDb();
  try {
    await db.exec(await migration(GRACE));
    for (const n of [11, 12, 13, 14]) await addUser(db, n, 'free');
    await addPaddle(db, 11, 'active', "now()-interval '49 hours'");  // grace over, cron not run yet
    await addPaddle(db, 12, 'active', "now()-interval '10 hours'");  // still in grace
    await addPaddle(db, 13, 'active', "now()-interval '49 hours'");
    await db.query(`insert into subscriptions(user_id,creem_subscription_id,creem_customer_id,product_id,price_id,status,current_period_end,environment)
      values ($1,'sub_creem13','cust_c13','prod_monthly','pro_monthly','active',now()+interval '20 days','sandbox')`, [id(13)]);
    await stale(db, [11, 12, 13]);

    const run = async (n, body, pct = 50) => {
      const calls = [], seen = [];
      const h = await loadEdge('supabase/functions/creem-checkout/index.ts', { env, clientFactory: () => checkoutClient(db, n, calls), fetch: transport(seen, pct) });
      return { res: await buy(h, body, '192.0.2.' + n), calls, seen };
    };
    // Grace over: the per-user expiry runs before reserving, so the stale cache does not block.
    const ok = await run(11, { billing: 'monthly', discountCode: 'PADDLE50' });
    assert.equal(ok.res.url, 'https://checkout.creem.io/ch_1');
    assert.deepEqual(ok.calls, ['expire_paddle_grace', 'reserve_creem_checkout']);
    assert.equal(ok.seen[0].discount_code, 'PADDLE50');
    assert.equal(ok.seen[0].product_id, 'prod_monthly');
    assert.equal(await plan(db, 11), 'free');

    // In grace: keeps Pro, cannot open a second subscription yet.
    assert.equal((await run(12, { billing: 'monthly', discountCode: 'PADDLE50' })).res.reason, 'already_subscribed');
    assert.equal(await status(db, 12), 'active');
    // Already on Creem: no duplicate subscription.
    assert.equal((await run(13, { billing: 'monthly', discountCode: 'PADDLE50' })).res.reason, 'already_subscribed');
    // PADDLE50 is monthly only, and only for accounts with Paddle history.
    assert.equal((await run(11, { billing: 'annual', discountCode: 'PADDLE50' })).res.reason, 'invalid_code');
    assert.equal((await run(14, { billing: 'monthly', discountCode: 'PADDLE50' })).res.reason, 'invalid_code');
    assert.equal((await run(14, { billing: 'monthly', discountCode: 'OTHER50' })).res.reason, 'invalid_code');
    assert.equal((await run(14, { billing: 'packs', discountCode: 'PRODUCTHUNT20' })).res.reason, 'invalid_code');
    // A Creem discount whose percentage does not match the expected rule fails closed.
    assert.equal((await run(14, { billing: 'monthly', discountCode: 'PRODUCTHUNT20' }, 50)).res.reason, 'checkout_unavailable');
    const ph = await run(14, { billing: 'monthly', discountCode: 'PRODUCTHUNT20' }, 20);
    assert.ok(ph.res.url?.startsWith('https://checkout.creem.io/'));
    assert.equal(ph.seen[0].discount_code, 'PRODUCTHUNT20');
  } finally { await db.close(); }
});

// ---- PADDLE_TRANSITION notice ----
function memoryClient(tables, rpcCalls) {
  const match = (row, f) => f.every(([op, k, v]) => op === 'eq' ? row[k] === v : op === 'in' ? v.includes(row[k]) : op === 'notnull' ? row[k] != null : true);
  return {
    auth: { getUser: async () => ({ data: { user: null } }) },
    rpc: async (name, args) => { rpcCalls.push(name);
      if (name === 'ensure_email_preferences') for (const u of args._user_ids) if (!tables.email_preferences.some(p => p.user_id === u)) tables.email_preferences.push({ user_id: u, marketing_unsubscribed: false, unsubscribe_token: 'tok-' + u.slice(-2) });
      return { data: null, error: null }; },
    from(table) {
      const f = []; let patch = null;
      const rows = () => tables[table].filter(r => match(r, f));
      const q = {
        select: () => q, eq: (k, v) => { f.push(['eq', k, v]); return q; }, in: (k, v) => { f.push(['in', k, v]); return q; },
        not: (k) => { f.push(['notnull', k]); return q; },
        update: p => { patch = p; return q; },
        upsert: async (row) => { if (!tables[table].some(r => r.campaign === row.campaign && r.user_id === row.user_id)) tables[table].push({ id: 'send-' + (tables[table].length + 1), status: 'pending', ...row }); return { error: null }; },
        maybeSingle: async () => { const r = rows(); if (patch) r.forEach(x => Object.assign(x, patch)); return { data: r[0] ?? null, error: null }; },
        then: (res, rej) => { const r = rows(); if (patch) r.forEach(x => Object.assign(x, patch)); return Promise.resolve({ data: r, error: null }).then(res, rej); },
      };
      return q;
    },
  };
}
const hours = h => new Date(Date.now() + h * 3600_000).toISOString();
function fixtures() {
  const sub = (n, end, extra = {}) => ({ id: `5000000${n}-sub`, user_id: id(n), status: 'active', current_period_end: end, paddle_subscription_id: 'sub_p' + n, creem_subscription_id: null, ...extra });
  return {
    subscriptions: [
      sub(21, hours(36)), sub(22, hours(40)), sub(23, hours(150)), sub(24, hours(30)), sub(25, hours(30)), sub(26, hours(-50)),
      sub(27, hours(20)), sub(28, hours(-10)),
      { id: 'creem-25', user_id: id(25), status: 'active', current_period_end: hours(600), paddle_subscription_id: null, creem_subscription_id: 'sub_c25' },
    ],
    plan_overrides: [{ user_id: id(27), expires_at: null }],
    checkout_attempts: [21, 22, 23, 25, 26, 27, 28].map(n => ({ user_id: id(n), discount_code: 'ONEHACK100', price_id: 'pro_normal', status: 'completed' }))
      .concat([{ user_id: id(24), discount_code: null, price_id: 'pro_normal', status: 'completed' }]),
    profiles: [21, 22, 23, 24, 25, 26, 27, 28].map(n => ({ id: id(n), email: `u${n}@example.test` })),
    campaign_sends: [],
    email_preferences: [{ user_id: id(22), marketing_unsubscribed: true, unsubscribe_token: 'tok-22' }],
    user_roles: [],
  };
}

test('PADDLE_TRANSITION: dry run by default, disabled flag blocks sending, sends once per trial user, never to payers', async () => {
  const tables = fixtures(); const rpcCalls = []; const mails = [];
  const net = async (url, init) => { assert.equal(url, 'https://api.resend.com/emails'); mails.push({ body: JSON.parse(init.body), key: init.headers['Idempotency-Key'] }); return Response.json({ id: 're_' + mails.length }); };
  const load = (extraEnv = {}) => loadEdge('supabase/functions/paddle-transition-email/index.ts',
    { env: { SUPABASE_SERVICE_ROLE_KEY: 'svc', RESEND_API_KEY: 're_local', ...extraEnv }, clientFactory: () => memoryClient(tables, rpcCalls), fetch: net });
  const call = (h, body) => h(new Request('https://qa.invalid', { method: 'POST', headers: { Authorization: 'Bearer svc' }, body: JSON.stringify(body) })).then(async r => ({ status: r.status, body: await r.json() }));

  const h = await load();
  const dry = await call(h, {});
  assert.equal(dry.status, 200);
  assert.equal(dry.body.dry_run, true);
  assert.equal(dry.body.due_now, 2); // 21 (36h) and 28 (in grace); 23 is later
  assert.deepEqual(dry.body.skipped, { paid_pending_decision: 1, has_creem: 1, active_override: 1, unsubscribed: 1 });
  assert.equal(dry.body.paid_pending_decision_ids.length, 1);
  assert.equal(Object.values(dry.body.planned_send_by_lisbon_day).reduce((a, b) => a + b, 0), 3);
  assert.equal(JSON.stringify(dry.body).includes('@'), false); // no addresses in the report
  assert.equal(mails.length, 0); assert.equal(tables.campaign_sends.length, 0);

  const blocked = await call(h, { action: 'send', dry_run: false });
  assert.equal(blocked.status, 409); assert.equal(blocked.body.error, 'disabled'); assert.equal(mails.length, 0);

  const live = await load({ PADDLE_TRANSITION_EMAILS_ENABLED: 'true' });
  assert.equal((await call(live, { action: 'send' })).body.dry_run, true); // send needs dry_run:false explicitly
  const sent = await call(live, { action: 'send', dry_run: false });
  assert.equal(sent.body.sent, 2); assert.equal(mails.length, 2);
  assert.deepEqual(mails.map(m => m.body.to[0]).sort(), ['u21@example.test', 'u28@example.test']);
  assert.ok(mails.every(m => m.key.startsWith('PADDLE_TRANSITION-') && m.body.from === 'PromptForge Pro <noreply@promptforgepro.me>'));
  assert.ok(mails[0].body.html.includes('/pricing?code=PADDLE50&amp;billing=monthly'));
  const again = await call(live, { action: 'send', dry_run: false });
  assert.equal(again.body.sent, 0); assert.equal(mails.length, 2);
  assert.equal(again.body.skipped.already_sent, 2);
});

test('PADDLE_TRANSITION copy: PT and EN, Lisbon dates, 48h grace, PADDLE50, no em or en dash', async () => {
  const mod = await loadEdge('supabase/functions/_shared/campaignPaddleTransition.ts', { exportedModule: true });
  const m = mod.renderPaddleTransition({ periodEnd: '2026-11-30T00:40:00Z', claimUrl: 'https://promptforgepro.me/pricing?code=PADDLE50&r=x"y', unsubscribeUrl: 'https://promptforgepro.me/unsubscribe?t=t' });
  for (const s of [m.subject, m.html, m.text]) { assert.ok(!s.includes('\u2014')); assert.ok(!s.includes('\u2013')); }
  assert.ok(m.text.includes('30 de novembro, às 00:40 (hora de Lisboa)'));
  assert.ok(m.text.includes('2 de dezembro, às 00:40 (hora de Lisboa)'));
  assert.ok(m.text.includes('2 December at 00:40 (Lisbon time)'));
  assert.ok(m.text.includes('o Paddle não te vai cobrar nada'));
  assert.ok(m.text.includes('Paddle will not charge you anything'));
  assert.ok(m.html.includes('PADDLE50') && m.html.includes('&amp;r=x&quot;y'));
});
