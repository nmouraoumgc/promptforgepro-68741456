// e2e: library in Supabase (one-time local import, cross-browser), account area, account deletion.
const puppeteer = require('puppeteer-core'); const fs = require('fs'); const { execSync } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SITE = process.env.SITE || 'https://promptforgepro.me';
const OUT = '/workspace/pfp/features_v4/' + (process.env.TAG || 'prod'); fs.mkdirSync(OUT, { recursive: true });
const ONLY = (process.env.ONLY || 'mig,free,pro,premium,del').split(',');
const results = []; const ok = (n, c, x = '') => { const l = `${c ? 'PASS' : 'FAIL'} ${n}${x ? ' | ' + String(x).slice(0, 160) : ''}`; results.push(l); console.log(l); };
const rd = f => fs.readFileSync(f, 'utf8').trim();
const U = rd('/tmp/qa/url'), A = rd('/tmp/qa/anon');
function rest(kind, q) { execSync(`bash /tmp/qa/tok.sh ${kind}`); return JSON.parse(execSync(`curl -s "${U}/rest/v1/${q}" -H "apikey: ${A}" -H "Authorization: Bearer $(cat /tmp/qa/${kind}.tok)"`).toString()); }
async function go(p, u) { await p.goto(SITE + u, { waitUntil: 'networkidle2' }); await sleep(1500); }
async function newPage(b, lang = 'pt', seed = null) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1400, height: 1000 });
  await p.evaluateOnNewDocument((l, s) => {
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('pf_pro_trial_dialog_dismissed_v1', '1'); localStorage.setItem('pf_lang', l); if (s) localStorage.setItem('promptforge-storage', s); }
  }, lang, seed);
  p.on('dialog', d => d.accept());
  return { ctx, p };
}
async function login(p, kind) {
  await go(p, '/login');
  await p.type('input[type=email]', rd(`/tmp/qa/${kind}.email`)); await p.type('input[type=password]', rd(`/tmp/qa/${kind}.pw`));
  await p.click('button[type=submit]'); await sleep(5000);
}
const txt = (p, sel) => p.evaluate(s => document.querySelector(s)?.innerText ?? null, sel);

(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  // ---------- 1. one-time import + cross-browser
  if (ONLY.includes('mig')) {
    const now = new Date().toISOString();
    const legacy = { state: { prompts: [
      { id: 'legacyA01', title: 'QA legado A', content: 'Versão 2 do prompt A', description: '', category: 'other', tags: ['qa'], outputType: 'text', targetModel: 'generic', variables: [],
        versions: [{ id: 'va1', promptId: 'legacyA01', content: 'Versão 1 do prompt A', createdAt: now, label: 'Versão inicial' }, { id: 'va2', promptId: 'legacyA01', content: 'Versão 2 do prompt A', createdAt: now, label: 'Otimizada' }],
        currentVersionId: 'va2', isFavorite: false, createdAt: now, updatedAt: now },
      { id: 'legacyB01', title: 'QA legado B', content: 'Prompt B', description: '', category: 'other', tags: [], outputType: 'text', targetModel: 'generic', variables: [],
        versions: [{ id: 'vb1', promptId: 'legacyB01', content: 'Prompt B', createdAt: now }], currentVersionId: 'vb1', isFavorite: true, createdAt: now, updatedAt: now },
    ], userProfile: 'beginner', darkMode: true }, version: 0 };
    const { ctx, p } = await newPage(b, 'pt', JSON.stringify(legacy));
    await go(p, '/library');
    const before = await p.evaluate(() => document.body.innerText.includes('QA legado A'));
    ok('[mig] signed-out: local prompts visible before login', before);
    await login(p, 'mig'); await sleep(2000);
    const rows = rest('mig', 'library_prompts?select=id,title,is_favorite,current_version_id');
    const vers = rest('mig', 'library_prompt_versions?select=id,prompt_id,content');
    ok('[mig] 2 local prompts imported to DB', rows.length === 2, JSON.stringify(rows.map(r => r.title)));
    ok('[mig] 3 versions imported, favourite + current version kept', vers.length === 3 && rows.some(r => r.is_favorite) && rows.every(r => r.current_version_id), `${vers.length}`);
    const ls = await p.evaluate(() => JSON.parse(localStorage.getItem('promptforge-storage') || '{}').state?.prompts);
    ok('[mig] localStorage cleared of prompts', !ls || ls.length === 0, JSON.stringify(ls)?.slice(0, 80));
    ok('[mig] import backup key removed', await p.evaluate(() => localStorage.getItem('promptforge-library-import') === null));
    await go(p, '/library'); await sleep(1500);
    await p.screenshot({ path: `${OUT}/library_migrated_pt.png` });
    // reload: no duplicate import
    await go(p, '/library'); await sleep(2000);
    ok('[mig] no duplicate import after reload', rest('mig', 'library_prompts?select=id').length === 2);
    // cross-browser: fresh context, same account
    const B = await newPage(b, 'en');
    await login(B.p, 'mig');
    const idA = rows.find(r => r.title === 'QA legado A').id;
    await go(B.p, `/library/${idA}?tab=run`); await sleep(2500);
    const vtext = await B.p.evaluate(() => document.body.innerText);
    ok('[mig] browser B: detail page loads from DB (current version content, 2 versions)', vtext.includes('Versão 2 do prompt A') && /2 versions|2 versões/.test(vtext), vtext.slice(0, 160).replace(/\n/g, ' '));
    await B.p.screenshot({ path: `${OUT}/detail_versions_crossbrowser_en.png` });
    // B: favourite prompt A; A sees it after reload
    const favBtn = await B.p.$('button svg.lucide-star'); if (favBtn) { const h = await favBtn.evaluateHandle(s => s.closest('button')); await h.click(); }
    await sleep(2000);
    ok('[mig] browser B favourite saved to DB', rest('mig', `library_prompts?select=is_favorite&id=eq.${idA}`)[0]?.is_favorite === true);
    // B: delete prompt B; A no longer shows it
    const idB = rows.find(r => r.title === 'QA legado B').id;
    await go(B.p, `/library/${idB}`); await sleep(1500);
    const del = await B.p.$('button.text-destructive, button svg.lucide-trash2, button svg.lucide-trash-2');
    if (del) { const h = await del.evaluateHandle(s => s.closest('button') || s); await h.click(); }
    await sleep(2500);
    await go(p, '/library'); await sleep(2000);
    const aText = await p.evaluate(() => document.body.innerText);
    ok('[mig] browser A sees B\'s delete (cross-browser)', aText.includes('QA legado A') && !aText.includes('QA legado B'));
    // sign out in A: library must not leak
    await p.evaluate(async () => { const k = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token')); if (k) localStorage.removeItem(k); });
    await go(p, '/library'); await sleep(2000);
    ok('[mig] signed out: library empty (no leak in localStorage/UI)', !(await p.evaluate(() => document.body.innerText.includes('QA legado A'))));
    await ctx.close(); await B.ctx.close();
  }
  // ---------- 2. account area per plan / lang
  const LIM = { free: ['5', '1'], pro: ['100', '3'], premium: ['300', '∞'] };
  for (const kind of ['free', 'pro', 'premium'].filter(k => ONLY.includes(k))) {
    const { ctx, p } = await newPage(b, 'pt');
    await login(p, kind);
    for (const lang of ['pt', 'en']) {
      const T = `[${kind}/${lang}]`;
      await p.evaluate(l => localStorage.setItem('pf_lang', l), lang);
      await go(p, '/'); await p.click('[data-testid=user-menu]'); await sleep(500);
      await p.click('[data-testid=menu-account]'); await sleep(2500);
      ok(`${T} account menu -> /account`, (await p.evaluate(() => location.pathname)) === '/account');
      const body = await p.evaluate(() => document.body.innerText);
      ok(`${T} title`, lang === 'pt' ? body.includes('A minha conta') : body.includes('My account') || body.includes('My Account'));
      ok(`${T} sections present`, ['account-profile', 'account-password', 'account-usage', 'account-danger', 'account-sub-status'].every(id => body && true) && await p.evaluate(() => ['account-profile', 'account-password', 'account-usage', 'account-danger', 'account-sub-status'].every(id => document.querySelector(`[data-testid=${id}]`))));
      const runs = await txt(p, '[data-testid=usage-runs]'), brands = await txt(p, '[data-testid=usage-brands]');
      ok(`${T} usage runs limit ${LIM[kind][0]}`, new RegExp(`^\\d+ / ${LIM[kind][0]}$`).test(runs || ''), runs);
      ok(`${T} brand profiles limit ${LIM[kind][1]}`, (brands || '').endsWith(`/ ${LIM[kind][1]}`), brands);
      const sub = await txt(p, '[data-testid=account-sub-status]');
      ok(`${T} subscription status text`, lang === 'pt' ? /Sem subscrição|sem subscrição recorrente/.test(sub) : /No paid subscription|without a recurring/.test(sub), sub);
      ok(`${T} billing portal + invoices note`, lang === 'pt' ? body.includes('faturas estão disponíveis') : body.includes('Invoices are available'));
      await p.screenshot({ path: `${OUT}/account_${kind}_${lang}.png`, fullPage: true });
      await p.setViewport({ width: 390, height: 844, isMobile: true }); await sleep(1000);
      ok(`${T} mobile no horizontal overflow`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
      await p.screenshot({ path: `${OUT}/account_${kind}_${lang}_mobile.png`, fullPage: true });
      await p.setViewport({ width: 1400, height: 1000 }); await sleep(500);
    }
    // name save persists
    const nm = `QA ${kind} ${Date.now() % 1000}`;
    await p.click('#acc-name', { clickCount: 3 }); await p.type('#acc-name', nm); await p.click('[data-testid=acc-name-save]'); await sleep(2000);
    await go(p, '/account'); await sleep(1500);
    ok(`[${kind}] display name saved + persists`, (await p.$eval('#acc-name', e => e.value)) === nm);
    if (kind === 'free') {
      // runs counter increments after one Executar (free Groq)
      execSync('bash /tmp/qa/tok.sh free');
      const before = await txt(p, '[data-testid=usage-runs]');
      execSync(`curl -s "${U}/functions/v1/run-prompt" -H "apikey: ${A}" -H "Authorization: Bearer $(cat /tmp/qa/free.tok)" -H 'Content-Type: application/json' -d '{"prompt":"Diz olá numa palavra."}' -o /dev/null`);
      await go(p, '/account'); await sleep(2000);
      const after = await txt(p, '[data-testid=usage-runs]');
      ok('[free] runs today counter increments', parseInt(after) === parseInt(before) + 1, `${before} -> ${after}`);
      // password change: wrong current rejected, right current works, then login with new pw
      await p.type('#acc-pw-cur', 'wrong-password-123'); await p.type('#acc-pw-1', 'NewPassw0rd!x'); await p.type('#acc-pw-2', 'NewPassw0rd!x');
      await p.click('[data-testid=acc-pw-save]'); await sleep(2500);
      ok('[free] wrong current password rejected', /incorreta|incorrect/i.test(await p.evaluate(() => document.body.innerText)));
      const newPw = 'Qa-' + require('crypto').randomBytes(12).toString('base64url');
      await go(p, '/account');
      await p.type('#acc-pw-cur', rd('/tmp/qa/free.pw')); await p.type('#acc-pw-1', newPw); await p.type('#acc-pw-2', newPw);
      await p.click('[data-testid=acc-pw-save]'); await sleep(3500);
      const changed = /Palavra-passe alterada|Password changed/.test(await p.evaluate(() => document.body.innerText));
      if (changed) fs.writeFileSync('/tmp/qa/free.pw', newPw, { mode: 0o600 });
      execSync('bash /tmp/qa/tok.sh free');
      ok('[free] password changed; new password signs in', changed && rd('/tmp/qa/free.tok').length > 100);
      // email change -> confirmation flow (address on a reserved .invalid domain)
      await go(p, '/account');
      await p.type('#acc-email', `qa-change-${Date.now()}@promptforgepro-qa.invalid`); await p.click('[data-testid=acc-email-save]'); await sleep(4000);
      const sent = await txt(p, '[data-testid=acc-email-sent]'); const b2 = await p.evaluate(() => document.body.innerText);
      ok('[free] change email -> confirmation message (or clear Supabase error)', !!sent || /Não foi possível alterar o email|Could not change the email/.test(b2), sent || b2.match(/(Não foi possível alterar o email|Could not change the email).{0,120}/s)?.[0]);
      ok('[free] email unchanged until confirmed', rest('free', 'profiles?select=email')[0]?.email === rd('/tmp/qa/free.email'));
      await p.screenshot({ path: `${OUT}/account_email_change_free_pt.png` });
    }
    await ctx.close();
  }
  // ---------- 3. delete account
  if (ONLY.includes('del')) {
    const { ctx, p } = await newPage(b, 'pt');
    await login(p, 'del'); await go(p, '/account');
    await p.click('[data-testid=acc-delete-open]'); await sleep(800);
    await p.type('[data-testid=acc-delete-input]', 'apagar?');
    ok('[del] confirm disabled until typed APAGAR', await p.$eval('[data-testid=acc-delete-confirm]', e => e.disabled));
    await p.screenshot({ path: `${OUT}/account_delete_dialog_pt.png` });
    await p.click('[data-testid=acc-delete-input]', { clickCount: 3 }); await p.type('[data-testid=acc-delete-input]', 'APAGAR');
    ok('[del] confirm enabled after APAGAR', !(await p.$eval('[data-testid=acc-delete-confirm]', e => e.disabled)));
    await p.click('[data-testid=acc-delete-confirm]'); await sleep(5000);
    ok('[del] redirected to /login after deletion', (await p.evaluate(() => location.pathname)) === '/login');
    const tok = JSON.parse(execSync(`curl -s "${U}/auth/v1/token?grant_type=password" -H "apikey: ${A}" -H 'Content-Type: application/json' -d '${JSON.stringify({ email: rd('/tmp/qa/del.email'), password: rd('/tmp/qa/del.pw') })}'`).toString());
    ok('[del] deleted account can no longer sign in', !tok.access_token, tok.error_code || tok.msg);
    await ctx.close();
  }

  // ---------- 4. 2€ trial gone everywhere (PT/EN) + ?code= prefill
  if (ONLY.includes('pricing')) {
    const BAD = /2 ?€|€ ?2(?![0-9])|2 euros|7 dias|7 days|7-day|Experimenta o Pro por|Try Pro for/i;
    for (const lang of ['pt', 'en']) {
      const { ctx, p } = await newPage(b, lang);
      await p.evaluateOnNewDocument(() => localStorage.removeItem('pf_pro_trial_dialog_dismissed_v1'));
      for (const u of ['/', '/pricing', '/packs', '/learn', '/learn/estrutura-de-um-bom-prompt', '/terms', '/refunds', '/create']) {
        await go(p, u); await sleep(u === '/' ? 4000 : 800);
        const t = await p.evaluate(() => document.body.innerText + ' ' + document.title + ' ' + (document.querySelector('meta[name=description]')?.content || ''));
        const m = t.match(BAD);
        ok(`[${lang}] no 2€ trial on ${u}`, !m, m ? t.slice(Math.max(0, m.index - 50), m.index + 50) : '');
        if (u === '/') ok(`[${lang}] no promo pop-up on dashboard`, !(await p.$('[role=dialog]')));
      }
      await go(p, '/pricing'); await p.screenshot({ path: `${OUT}/pricing_${lang}.png`, fullPage: true });
      await ctx.close();
    }
    const { ctx, p } = await newPage(b, 'en');
    await go(p, '/pricing?code=EARLY-A1');
    await login(p, 'free');
    await go(p, '/pricing'); await sleep(2500);
    const d = await p.evaluate(() => ({ dlg: !!document.querySelector('[role=dialog]'), val: document.querySelector('[role=dialog] input')?.value, hint: document.querySelector('[data-testid=promo-url-code]')?.innerText }));
    ok('[free/en] /pricing?code=EARLY-A1 survives login, opens Pro dialog with code prefilled', d.dlg && d.val === 'EARLY-A1' && /EARLY-A1/.test(d.hint || ''), JSON.stringify(d));
    await p.screenshot({ path: `${OUT}/pricing_code_prefill_en.png` });
    await p.evaluate(() => localStorage.setItem('pf_lang', 'pt')); await go(p, '/pricing?code=EARLY-A1'); await sleep(2500);
    const d2 = await p.evaluate(() => document.querySelector('[data-testid=promo-url-code]')?.innerText);
    ok('[free/pt] code prefill PT', /O código EARLY-A1 será aplicado no checkout/.test(d2 || ''), d2);
    await p.screenshot({ path: `${OUT}/pricing_code_prefill_pt.png` });
    await ctx.close();
  }
  // logged-out /account -> login
  { const { ctx, p } = await newPage(b); await go(p, '/account'); await sleep(1500); ok('[anon] /account requires login', (await p.evaluate(() => location.pathname)) === '/login'); await ctx.close(); }
  await b.close();
  const f = results.filter(r => r.startsWith('FAIL')).length;
  console.log(`${results.length - f} pass, ${f} fail`);
  fs.writeFileSync(`${OUT}/results.txt`, results.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
