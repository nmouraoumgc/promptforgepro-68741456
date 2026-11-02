// e2e: ?prompt= prefill in the optimiser (/create?mode=optimize). Backend mocked (fake user qa.mock@example.com).
// SITE=<url> runs against that origin (production: only read-only checks + mocked Supabase, nothing written).
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIST = '/workspace/pfp/app/dist'; const OUT = process.env.OUT || '/workspace/pfp/prompt_prefill/local'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); if (u.pathname.startsWith('/_vercel/')) { res.writeHead(404); return res.end(); } let f = path.join(DIST, decodeURIComponent(u.pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) f = path.join(DIST, 'spa.html');
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const uid = '00000000-0000-4000-8000-000000000001';
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'qa.mock@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: {}, identities: [{ id: uid }], created_at: '2026-01-01T00:00:00Z' };
const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const JWT = `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: uid, role: 'authenticated', aud: 'authenticated', email: user.email, exp: Math.floor(Date.now() / 1000) + 86400 })}.sig`;
const SESSION = { access_token: JWT, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24, refresh_token: 'r', user };
const PROMPT = 'Write a short email to a client asking them to pay an overdue invoice. Keep it polite.';
const SEND = '11111111-2222-4333-8444-555555555555';
const results = []; const ok = (n, c, x = '') => { const l = `${c ? 'PASS' : 'FAIL'} ${n}${x ? ' | ' + String(x).slice(0, 200) : ''}`; results.push(l); console.log(l); };
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const SITE = process.env.SITE || `http://127.0.0.1:${server.address().port}`;
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  const mk = async ({ lang = 'en', signedIn = true, draft = null, vw = 1366 } = {}) => {
    const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); const errs = []; const calls = { opt: 0, run: 0, login: 0, landing: [] };
    p.on('pageerror', e => errs.push(e.message));
    await p.setViewport({ width: vw, height: vw < 500 ? 844 : 900 });
    await p.setRequestInterception(true);
    const profile = { id: uid, user_id: uid, email: user.email, current_plan: 'free', full_name: 'QA', created_at: '2026-01-01T00:00:00Z', onboarding_completed: true };
    p.on('request', r => {
      const url = r.url();
      if (url.startsWith(SITE) || url.startsWith('data:')) return r.continue();
      if (url.includes('.supabase.co')) {
        const J = (o, s = 200) => r.respond({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
        if (r.method() === 'OPTIONS') return r.respond({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: '' });
        if (url.includes('/functions/v1/optimize-prompt')) { calls.opt++; return J({ score: { overall: 40 }, improvements: [], optimizations: [] }); }
        if (url.includes('/functions/v1/run-prompt')) { const body = JSON.parse(r.postData() || '{}'); if (body.peek) return J({ used: 0, limit: 5 }); calls.run++; return J({ result: 'x', used: 1, limit: 5 }); }
        if (url.includes('/auth/v1/token')) { calls.login++; return J(SESSION); }
        if (url.includes('/auth/v1/user')) return J(user);
        if (url.includes('/rest/v1/rpc/log_campaign_landing')) { calls.landing.push(r.postData()); return r.respond({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' }); }
        if (url.includes('/rest/v1/profiles')) { const one = (r.headers()['accept'] || '').includes('vnd.pgrst.object'); return J(one ? profile : [profile]); }
        if (url.includes('/rest/v1/rpc/')) return r.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: 'null' });
        return r.respond({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/0', 'access-control-allow-origin': '*' }, body: (r.headers()['accept'] || '').includes('vnd.pgrst.object') ? 'null' : '[]' });
      }
      return r.abort();
    });
    await p.evaluateOnNewDocument((lang, user, signedIn, session, draft) => {
      if (!sessionStorage.getItem('qa-init')) {
        sessionStorage.setItem('qa-init', '1');
        localStorage.setItem('pf_lang', lang); localStorage.setItem('pf_pro_trial_dialog_dismissed_v1', '1');
        if (signedIn) localStorage.setItem('sb-cwrxbxxfaemcvliasycz-auth-token', JSON.stringify(session));
        if (draft) localStorage.setItem(`pfp_draft_v1:${user.id}:create-optimize`, JSON.stringify({ savedAt: Date.now(), data: { input: draft, optimizations: [], promptKey: 'k' } }));
      }
    }, lang, user, signedIn, SESSION, draft);
    return { p, ctx, errs, calls };
  };
  const go = async (p, u) => { await p.goto(SITE + u, { waitUntil: 'networkidle0', timeout: 60000 }); await sleep(1500); };
  const val = p => p.$eval('[data-testid=optimizer-input]', e => e.value).catch(() => null);
  const href = p => p.evaluate(() => location.pathname + location.search);
  const link = (prompt, lang = 'en') => `/create?mode=optimize&lang=${lang}&prompt=${encodeURIComponent(prompt)}&c=ACTIVATION1&r=${SEND}`;

  { // 1. signed in: fills the box, never runs, URL cleaned, other params kept
    const { p, ctx, errs, calls } = await mk();
    await go(p, link(PROMPT));
    ok('signed in: box filled with ?prompt=', (await val(p)) === PROMPT, await val(p));
    const h = await href(p);
    ok('URL: prompt, c, r removed; mode and lang kept', h === '/create?mode=optimize&lang=en', h);
    ok('history: no entry added (replace; 1 = about:blank + 1 visit)', (await p.evaluate(() => history.length)) === 2, await p.evaluate(() => history.length));
    ok('never auto-runs (0 optimise, 0 run calls)', calls.opt === 0 && calls.run === 0, JSON.stringify(calls));
    ok('campaign landing logged once with ACTIVATION1 + send id', calls.landing.length === 1 && calls.landing[0].includes('ACTIVATION1') && calls.landing[0].includes(SEND), calls.landing.join());
    ok('no draft-restored notice', !(await p.$('[data-testid=draft-restored]')));
    await p.screenshot({ path: `${OUT}/01_en_signed_in_prefilled.png` });
    await p.reload({ waitUntil: 'networkidle0' }); await sleep(1200);
    ok('reload: URL stays clean, box keeps the text (saved as draft)', (await href(p)) === '/create?mode=optimize&lang=en' && (await val(p)) === PROMPT, await val(p));
    ok('no page errors (1)', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  { // 2. wins over a saved draft
    const { p, ctx } = await mk({ draft: 'OLD DRAFT TEXT' });
    await go(p, link(PROMPT));
    ok('?prompt= wins over saved draft', (await val(p)) === PROMPT, await val(p));
    await go(p, '/create?mode=optimize'); 
    ok('afterwards the draft holds the link prompt (old draft replaced)', (await val(p)) === PROMPT, await val(p));
    await ctx.close();
  }
  { // 2b. draft still restored when there is no ?prompt=
    const { p, ctx } = await mk({ draft: 'OLD DRAFT TEXT' });
    await go(p, '/create?mode=optimize');
    ok('no ?prompt=: saved draft restored as before', (await val(p)) === 'OLD DRAFT TEXT' && !!(await p.$('[data-testid=draft-restored]')), await val(p));
    await ctx.close();
  }
  { // 3. length cap, plain text, control chars
    const { p, ctx } = await mk();
    await go(p, link('A'.repeat(2500)));
    const v = await val(p);
    ok('capped at 2000 chars', v && v.length === 2000, v && v.length);
    await go(p, link('<img src=x onerror="window.__pwn=1"><b>bold</b>\u0007bell\r\nline2'));
    const v2 = await val(p);
    ok('plain text: HTML kept literally in the box, not rendered/executed', v2 === '<img src=x onerror="window.__pwn=1"><b>bold</b>bell\nline2' && !(await p.evaluate(() => window.__pwn)), JSON.stringify(v2));
    await go(p, '/create?mode=optimize&prompt=');
    ok('empty ?prompt= ignored and removed', (await href(p)) === '/create?mode=optimize', await href(p));
    await ctx.close();
  }
  { // 4. PT link
    const PT = 'Escreve um email curto a um cliente a pedir que pague uma fatura em atraso. Mantém um tom educado.';
    const { p, ctx } = await mk({ lang: 'pt', vw: 390 });
    await go(p, link(PT, 'pt'));
    ok('PT (accents) filled, mobile', (await val(p)) === PT, await val(p));
    await p.screenshot({ path: `${OUT}/02_pt_mobile_prefilled.png` });
    await ctx.close();
  }
  { // 5. signed out -> login -> back with the prompt
    const { p, ctx, errs, calls } = await mk({ signedIn: false });
    await go(p, link(PROMPT));
    const h = await href(p);
    const red = new URL('http://x' + h).searchParams.get('redirect') || '';
    ok('signed out: sent to /login with ?redirect= keeping mode, lang and prompt', h.startsWith('/login') && (() => { const u = new URL('http://x' + red); return u.pathname === '/create' && u.searchParams.get('mode') === 'optimize' && u.searchParams.get('lang') === 'en' && u.searchParams.get('prompt') === PROMPT; })(), h);
    ok('signed out: c/r stripped before redirect but landing logged', !red.includes('c=ACTIVATION1') && calls.landing.length === 1, calls.landing.length);
    await p.screenshot({ path: `${OUT}/03_login_with_redirect.png` });
    await p.type('input[type=email]', user.email); await p.type('input[type=password]', 'not-a-real-password');
    await p.click('button[type=submit]'); await sleep(4000);
    ok('login (mocked) called', calls.login === 1, calls.login);
    ok('after login: back on the optimiser, box filled', (await val(p)) === PROMPT, `${await href(p)} | ${await val(p)}`);
    ok('after login: URL cleaned', (await href(p)) === '/create?mode=optimize&lang=en', await href(p));
    ok('after login: never auto-runs', calls.opt === 0 && calls.run === 0, JSON.stringify(calls));
    await p.screenshot({ path: `${OUT}/04_after_login_prefilled.png` });
    ok('no page errors (5)', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  { // 6. library optimiser ignores ?prompt= (only the Create screen reads it)
    const { p, ctx } = await mk();
    await go(p, `/create?mode=quick&prompt=${encodeURIComponent(PROMPT)}`);
    ok('quick mode: ?prompt= not used by the optimiser (mode untouched)', (await href(p)).startsWith('/create?mode=quick'), await href(p));
    await ctx.close();
  }
  fs.writeFileSync(`${OUT}/results.txt`, results.join('\n') + '\n');
  console.log(`${results.filter(r => r.startsWith('PASS')).length}/${results.length} PASS`);
  await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
