// Renders the A1 email for preview: node render_preview.mjs [expiresISO] [firstName]
import { renderA1 } from '/tmp/camp/a1.mjs';
import fs from 'fs';
const exp = process.argv[2] ? new Date(process.argv[2]) : new Date(Date.now() + 24 * 3600e3);
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(exp);
const m = renderA1({ firstName: process.argv[3] || null, expiresLisbon: fmt, claimUrl: 'https://promptforgepro.me/pricing?code=EARLYA1', unsubscribeUrl: 'https://promptforgepro.me/unsubscribe?t=00000000-0000-0000-0000-000000000000' });
fs.writeFileSync('/workspace/pfp/campaign/email_A1.html', m.html); fs.writeFileSync('/workspace/pfp/campaign/email_A1.txt', m.text);
console.log(m.subject, '|', fmt);
