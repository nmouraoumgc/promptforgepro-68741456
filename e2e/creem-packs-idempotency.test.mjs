import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migration = name => readFile('supabase/migrations/'+name,'utf8');

test('Creem Packs paid orders grant once; duplicate delivery and different owners cannot duplicate access', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table public.purchases(id serial primary key, user_id uuid not null, creem_order_id text, plan text, status text);`);
    await db.exec(await migration('20261124130000_creem_packs_purchases.sql'));
    await db.exec(await migration('20261125120000_creem_packs_order_conflict.sql'));
    await db.exec(`insert into purchases(user_id,plan,status) values
      ('10000000-0000-4000-8000-000000000001','packs','completed'),
      ('10000000-0000-4000-8000-000000000002','packs','completed');`);
    const insert = async (user, order) => db.query(`insert into purchases(user_id,creem_order_id,plan,status)
      values ($1,$2,'packs','completed') on conflict (creem_order_id) do nothing returning user_id`, [user,order]);
    const owner='10000000-0000-4000-8000-000000000003';
    assert.equal((await insert(owner,'ord_paid')).rows.length,1);
    assert.equal((await insert(owner,'ord_paid')).rows.length,0);
    assert.equal((await insert('10000000-0000-4000-8000-000000000004','ord_paid')).rows.length,0);
    assert.equal((await db.query("select count(*)::int as n from purchases where creem_order_id='ord_paid'")).rows[0].n,1);
  } finally { await db.close(); }
});
