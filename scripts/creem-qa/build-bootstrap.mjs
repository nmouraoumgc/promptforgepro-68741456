import { readFileSync, readdirSync } from 'node:fs';

const migrations = new URL('../../supabase/migrations/', import.meta.url);

function readMigration(timestamp) {
  const files = readdirSync(migrations).filter(file => file.startsWith(timestamp + '_'));
  if (files.length !== 1) throw new Error('Expected one migration for ' + timestamp);
  return readFileSync(new URL(files[0], migrations), 'utf8');
}

function section(sql, start, end) {
  const from = sql.indexOf(start);
  const to = sql.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error('Migration section missing: ' + start);
  return sql.slice(from, to).trim();
}

const base = readMigration('20260101093607');
const plans = readMigration('20261030230100');

const statements = [
  section(base, 'CREATE OR REPLACE FUNCTION public.has_role', '-- User roles policies'),
  readMigration('20261027201000').trim(),
  section(base, 'CREATE TABLE public.purchases', '-- Create function to handle new user signup'),
  section(readMigration('20260525114020'), 'CREATE TABLE public.checkout_attempts', '-- Dunning notifications'),
  section(readMigration('20260430081854'), 'create table if not exists public.subscriptions', 'create or replace function public.has_active_subscription'),
  section(readMigration('20261029100000'), 'ALTER TABLE public.checkout_attempts', '-- Client-callable logger'),
  section(readMigration('20261029140000'), 'ALTER TABLE public.checkout_attempts', 'CREATE OR REPLACE FUNCTION public.block_disposable_email'),
  readMigration('20261029140100').trim(),
  section(readMigration('20261030130000'), 'CREATE TABLE IF NOT EXISTS public.payment_failures', 'CREATE TABLE IF NOT EXISTS public.discount_flags'),
  section(plans, 'create table if not exists public.plan_overrides', '-- 4) Grandfather'),
  section(readMigration('20261122120000'), 'alter table public.subscriptions', '-- The profile stores the effective plan'),
];

if (/cron\.|net\.http|https?:\/\//i.test(statements.join('\n'))) {
  throw new Error('QA bootstrap must not contain cron or outbound HTTP');
}

const template = readFileSync(new URL('bootstrap.sql.in', import.meta.url), 'utf8');
process.stdout.write(template.replace('-- BILLING_MIGRATIONS', () => statements.join('\n\n')));
