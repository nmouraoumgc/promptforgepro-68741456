import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const base = await fs.readFile('supabase/migrations/20261030230100_packs_entitlements.sql','utf8');
const original = base.match(/create or replace function public\.recompute_profile_plan\(_user_id uuid\)[\s\S]*?\$\$;/)[0];
await db.exec(`
create type public.plan_type as enum ('free','pro','premium','packs');
create table profiles(id uuid primary key,current_plan plan_type,updated_at timestamptz default '2000-01-01');
create table plan_overrides(user_id uuid primary key,plan plan_type,expires_at timestamptz);
create table purchases(user_id uuid,plan plan_type,status text);
create table subscriptions(user_id uuid,price_id text,status text,current_period_end timestamptz);
create table qa_calls(user_id uuid);
create table qa_fail(user_id uuid);
create schema cron;
create table cron.job(jobid bigint generated always as identity,jobname text unique,schedule text,command text);
-- Only registration is mocked: PGlite has no pg_cron worker. The saved job SQL is executed below.
create function cron.schedule(text,text,text) returns bigint language sql as $$
 insert into cron.job(jobname,schedule,command) values ($1,$2,$3) returning jobid;
$$;
`);
// Instrument the existing production recompute function without replacing its entitlement rules.
await db.exec(original.replace('begin\n',`begin\n  if exists(select 1 from qa_fail where user_id=_user_id) then raise exception 'QA injected failure'; end if;\n  insert into qa_calls values (_user_id);\n`));
const migrationName = (await fs.readdir('supabase/migrations')).find(n=>n.endsWith('_expired_override_hourly_recompute.sql'));
assert.ok(migrationName);
const migration = await fs.readFile('supabase/migrations/'+migrationName,'utf8');
async function fixtures(){
 await db.exec('truncate profiles,plan_overrides,purchases,subscriptions,qa_calls,qa_fail');
 for(const [n,plan,expiry] of [[1,'pro','past'],[2,'premium','past'],[3,'packs','past'],[4,'pro','future'],[5,'premium','permanent'],[6,'free','past'],[7,'pro','absent']]){
  await db.query('insert into profiles(id,current_plan) values ($1,$2)',[id(n),plan]);
  if(expiry!=='absent') await db.query(`insert into plan_overrides values ($1,$2,${expiry==='past'?"now()-interval '1 second'":expiry==='future'?"now()+interval '1 day'":'null'})`,[id(n),plan]);
 }
 await db.query("insert into purchases values ($1,'premium','completed')",[id(2)]);
 await db.query("insert into subscriptions values ($1,'pro_monthly','active',now()+interval '1 day')",[id(3)]);
}
const dryRun = `select count(*)::integer as count from public.profiles p where p.current_plan in ('pro'::public.plan_type,'premium'::public.plan_type,'packs'::public.plan_type) and exists(select 1 from public.plan_overrides o where o.user_id=p.id and o.expires_at is not null and o.expires_at<=now())`;
let command;
test('migration only registers one hourly job; does not run it or overwrite an existing job',async()=>{
 await fixtures();const before=(await db.query('select * from profiles order by id')).rows;
 await db.exec(migration);
 const jobs=(await db.query('select * from cron.job')).rows;
 assert.equal(jobs.length,1);assert.equal(jobs[0].jobname,'recompute-expired-overrides-hourly');assert.equal(jobs[0].schedule,'0 * * * *');command=jobs[0].command;
 assert.deepEqual((await db.query('select * from profiles order by id')).rows,before);
 assert.equal((await db.query('select count(*)::integer as count from qa_calls')).rows[0].count,0);
 await assert.rejects(()=>db.exec(migration),/already exists/);
 assert.equal((await db.query('select count(*)::integer as count from cron.job')).rows[0].count,1);
});
test('job matches dry-run candidates and preserves real paid rights and active/permanent grants',async()=>{
 assert.equal((await db.query(dryRun)).rows[0].count,3);
 await db.exec(command);
 assert.deepEqual((await db.query('select user_id from qa_calls order by user_id')).rows.map(r=>r.user_id),[id(1),id(2),id(3)]);
 assert.deepEqual((await db.query('select current_plan from profiles order by id')).rows.map(r=>r.current_plan),['free','premium','pro','pro','premium','free','pro']);
 assert.equal((await db.query('select count(*)::integer as count from plan_overrides')).rows[0].count,6);
 assert.equal((await db.query("select count(*)::integer as count from profiles where id=$1 and updated_at='2000-01-01'",[id(2)])).rows[0].count,1);
 // Legitimate paid accounts may be selected again, but are not downgraded or rewritten.
 await db.exec('truncate qa_calls');await db.exec(command);
 assert.deepEqual((await db.query('select user_id from qa_calls order by user_id')).rows.map(r=>r.user_id),[id(2),id(3)]);
});
test('a recompute failure aborts the job transaction instead of leaving partial changes',async()=>{
 await fixtures();await db.query('insert into qa_fail values ($1)',[id(3)]);
 const before=(await db.query('select * from profiles order by id')).rows;
 await assert.rejects(()=>db.exec(command),/QA injected failure/);
 assert.deepEqual((await db.query('select * from profiles order by id')).rows,before);
 assert.equal((await db.query('select count(*)::integer as count from qa_calls')).rows[0].count,0);
});
test.after(async()=>db.close());
