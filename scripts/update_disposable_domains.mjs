// Refresh public.disposable_email_domains from the maintained upstream list
// (github.com/disposable-email-domains/disposable-email-domains). Prints idempotent SQL to stdout;
// apply it with the Supabase SQL editor / MCP execute_sql. Never removes manual entries.
//   node scripts/update_disposable_domains.mjs > /tmp/disposable_refresh.sql
const URL = 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf';
const ALLOW = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com',
  'proton.me', 'protonmail.com', 'gmx.com', 'gmx.net', 'mail.com', 'aol.com', 'sapo.pt', 'promptforgepro.me']);
const txt = await (await fetch(URL)).text();
const doms = [...new Set(txt.split('\n').map((l) => l.trim().toLowerCase())
  .filter((l) => l && !l.startsWith('#') && /^[a-z0-9.-]+\.[a-z0-9-]+$/.test(l) && !ALLOW.has(l)))].sort();
if (doms.length < 1000) throw new Error(`suspiciously short list (${doms.length})`);
const out = [`-- ${doms.length} domains from upstream, ${new Date().toISOString()}`];
for (let i = 0; i < doms.length; i += 1000) {
  out.push('INSERT INTO public.disposable_email_domains(domain, source) VALUES\n' +
    doms.slice(i, i + 1000).map((d) => `('${d}','disposable-email-domains')`).join(',\n') + '\nON CONFLICT (domain) DO NOTHING;');
}
// Drop upstream entries that upstream has since removed (keeps 'manual' rows).
out.push(`DELETE FROM public.disposable_email_domains WHERE source = 'disposable-email-domains' AND domain <> ALL (ARRAY[${doms.map((d) => `'${d}'`).join(',')}]);`);
console.log(out.join('\n'));
