#!/usr/bin/env node
// Batch A1 sender. NOT RUN. Requires Nuno's approval to execute.
// Usage:
//   ADMIN_EMAIL=nunomourao84@gmail.com node send_A1.mjs            -> dry run (counts only, nothing sent)
//   ADMIN_EMAIL=... node send_A1.mjs --live                         -> activates the Paddle discount (expiry = now+24h) and sends
// The admin password is read from a hidden prompt (never stored or printed).
// All secrets (Paddle, Resend) stay server-side in the campaign-admin edge function.
import readline from 'node:readline';

const SUPABASE_URL = 'https://cwrxbxxfaemcvliasycz.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY;           // publishable key (same as VITE_SUPABASE_PUBLISHABLE_KEY)
const DISCOUNT_ID = 'dsc_01m5z9aw3bxygzgn2crrcgr7hz';  // EARLYA1, created archived
const LIVE = process.argv.includes('--live');
if (!ANON || !process.env.ADMIN_EMAIL) { console.error('Set SUPABASE_ANON_KEY and ADMIN_EMAIL'); process.exit(1); }

function askHidden(q) {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl._writeToOutput = () => {}; process.stdout.write(q);
    rl.question('', (a) => { rl.close(); process.stdout.write('\n'); res(a); });
  });
}
async function call(token, body) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/campaign-admin`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`${body.action}: HTTP ${r.status} ${JSON.stringify(j)}`); return j;
}

const pw = await askHidden('Admin password: ');
const auth = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: pw }) }).then((r) => r.json());
if (!auth.access_token) { console.error('Login failed'); process.exit(1); }
const T = auth.access_token;

const expiresAt = new Date(Date.now() + 24 * 3600e3).toISOString();
console.log('Status before:', JSON.stringify(await call(T, { action: 'status', campaign: 'early_access_2026', batch: 'A1' })));
console.log('Expiry (UTC):', expiresAt);

if (!LIVE) {
  const d = await call(T, { action: 'send', campaign: 'early_access_2026', batch: 'A1', expires_at: expiresAt, dry_run: true });
  console.log('DRY RUN (nothing sent):', JSON.stringify(d)); process.exit(0);
}
// 1) Activate discount with expiry = send time + 24h.
const disc = await call(T, { action: 'activate_discount', discount_id: DISCOUNT_ID, expires_at: expiresAt });
console.log('Discount:', JSON.stringify(disc));
if (disc.status !== 'active') { console.error('Discount not active; aborting before sending.'); process.exit(1); }
// 2) Send (server throttles ~4/s, idempotent per user, stops on quota). Re-running resumes pending rows.
const res = await call(T, { action: 'send', campaign: 'early_access_2026', batch: 'A1', expires_at: expiresAt, dry_run: false, max: 100 });
console.log('Send result:', JSON.stringify(res));
console.log('Status after:', JSON.stringify(await call(T, { action: 'status', campaign: 'early_access_2026', batch: 'A1' })));
