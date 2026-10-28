#!/usr/bin/env node
// Activates ONEHACK50 (dsc_01m6123494jym3885b5svdja7y) with expiry = now + 30 days. NOT RUN. Run only when the OneHack post is approved/going live.
// Usage: SUPABASE_ANON_KEY=... ADMIN_EMAIL=nunomourao84@gmail.com node activate_onehack.mjs [--live]   (without --live: prints the planned expiry only)
import readline from 'node:readline';
const SUPABASE_URL = 'https://cwrxbxxfaemcvliasycz.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY, DISCOUNT_ID = 'dsc_01m6123494jym3885b5svdja7y';
if (!ANON || !process.env.ADMIN_EMAIL) { console.error('Set SUPABASE_ANON_KEY and ADMIN_EMAIL'); process.exit(1); }
const expiresAt = new Date(Date.now() + 30 * 24 * 3600e3).toISOString();
console.log('Planned expiry (UTC):', expiresAt);
if (!process.argv.includes('--live')) process.exit(0);
const askHidden = (q) => new Promise((res) => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl._writeToOutput = () => {}; process.stdout.write(q); rl.question('', (a) => { rl.close(); process.stdout.write('\n'); res(a); }); });
const pw = await askHidden('Admin password: ');
const auth = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: pw }) }).then((r) => r.json());
if (!auth.access_token) { console.error('Login failed'); process.exit(1); }
const r = await fetch(`${SUPABASE_URL}/functions/v1/campaign-admin`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'activate_discount', discount_id: DISCOUNT_ID, expires_at: expiresAt }) });
console.log('Discount:', JSON.stringify(await r.json()));
