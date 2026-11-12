import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

describe('fraud controls', () => {
  it('matches normalized emails and linked customer IDs, and ignores disabled blocks', async () => {
    const db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TYPE public.app_role AS ENUM ('admin'); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$; CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$; CREATE TABLE public.subscriptions (user_id uuid, paddle_customer_id text, environment text); CREATE TABLE public.payment_failures (user_id uuid, source text, environment text, created_at timestamptz);`);
    const sql = await readFile('supabase/migrations/20261112123510_fraud_review_controls.sql', 'utf8');
    await db.exec(sql);
    await db.exec(`INSERT INTO public.fraud_blocklist(kind, value, reason) VALUES ('email','test@example.com','confirmed'), ('paddle_customer','ctm_123','confirmed'); INSERT INTO public.subscriptions VALUES ('11111111-1111-4111-8111-111111111111','ctm_123','live');`);
    const match = await db.query(`SELECT public.is_checkout_buyer_blocked(' TEST@example.com ', '22222222-2222-4222-8222-222222222222','live') AS email, public.is_checkout_buyer_blocked('other@example.com','11111111-1111-4111-8111-111111111111','live') AS customer, public.is_checkout_buyer_blocked('other@example.com','11111111-1111-4111-8111-111111111111','sandbox') AS sandbox`);
    // The browser chooses an environment, so an altered request must not bypass a block.
    expect(match.rows[0]).toEqual({email:true, customer:true, sandbox:true});
    await db.exec(`UPDATE public.fraud_blocklist SET active=false`);
    const disabled=await db.query(`SELECT public.is_checkout_buyer_blocked('test@example.com',NULL,'live') AS blocked`);
    expect(disabled.rows[0].blocked).toBe(false);
    await db.exec(`INSERT INTO public.payment_failures VALUES ('11111111-1111-4111-8111-111111111111','webhook','live',now()); SELECT public.flag_suspicious_payment('txn_123','11111111-1111-4111-8111-111111111111','live'); SELECT public.flag_suspicious_payment('txn_123','11111111-1111-4111-8111-111111111111','live');`);
    const alerts=await db.query('SELECT transaction_id, reason FROM public.fraud_payment_alerts');
    expect(alerts.rows).toEqual([{transaction_id:'txn_123',reason:'prior_failed_payment'}]);
    await db.exec(`INSERT INTO public.payment_failures VALUES ('22222222-2222-4222-8222-222222222222','client','live',now()), ('33333333-3333-4333-8333-333333333333','webhook','live',now() - interval '25 hours'); SELECT public.flag_suspicious_payment('txn_client','22222222-2222-4222-8222-222222222222','live'); SELECT public.flag_suspicious_payment('txn_old','33333333-3333-4333-8333-333333333333','live'); SELECT public.flag_suspicious_payment('txn_env','11111111-1111-4111-8111-111111111111','sandbox');`);
    expect((await db.query('SELECT count(*)::int AS n FROM public.fraud_payment_alerts')).rows[0].n).toBe(1);
    await db.exec('SET ROLE authenticated');
    expect((await db.query('SELECT count(*)::int AS n FROM public.fraud_blocklist')).rows[0].n).toBe(0);
    await expect(db.query("SELECT public.is_checkout_buyer_blocked('test@example.com',NULL,'live')")).rejects.toThrow(/permission denied/i);
    await db.close();
  });
});
