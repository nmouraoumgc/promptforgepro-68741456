// Renders the batch B email for preview: node render_preview_B.mjs [expiresISO] [firstName]
// Template = supabase/functions/_shared/campaignA1.ts (transpiled to /tmp/campB/tpl.mjs with esbuild), code EARLYB2, c=B links.
import { renderA1, BATCH_CODES } from '/tmp/campB/tpl.mjs';
import fs from 'fs';
const exp = new Date(process.argv[2] || '2026-10-29T19:00:00Z');
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(exp);
const code = BATCH_CODES.B;
const m = renderA1({ firstName: process.argv[3] || null, expiresLisbon: fmt, code, claimUrl: `https://promptforgepro.me/pricing?code=${code}&c=B&r=00000000-0000-0000-0000-000000000000`, unsubscribeUrl: 'https://promptforgepro.me/unsubscribe?t=00000000-0000-0000-0000-000000000000' });
fs.writeFileSync('/workspace/pfp/campaign/email_B.html', m.html); fs.writeFileSync('/workspace/pfp/campaign/email_B.txt', m.text);
console.log(m.subject, '|', code, '|', fmt);
