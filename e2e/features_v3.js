const puppeteer = require('puppeteer-core'); const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SITE = process.env.SITE || 'https://promptforgepro.me';
const OUT = '/workspace/pfp/features_v3' + (process.env.TAG ? '/' + process.env.TAG : ''); const NAV = '/workspace/pfp/features_v3/nav' + (process.env.TAG ? '/' + process.env.TAG : '');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(NAV, { recursive: true });
const ONLY = (process.env.ONLY || 'free2,pro,premium,free').split(',');
const results = []; const ok = (n, c, x = '') => { const l = `${c ? 'PASS' : 'FAIL'} ${n}${x ? ' | ' + x : ''}`; results.push(l); console.log(l); };
const rd = f => fs.readFileSync(f, 'utf8').trim();
const NAVL = { pt: ['Painel', 'Criar', 'Biblioteca', 'Packs', 'Aprender'], en: ['Dashboard', 'Create', 'Library', 'Packs', 'Learn'] };
const path = p => p.evaluate(() => location.pathname + location.search);
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
async function clickText(p, sel, re) { const h = await p.evaluateHandle((s, r) => [...document.querySelectorAll(s)].find(e => new RegExp(r).test(e.innerText)), sel, re.source); await h.click(); }
async function go(p, u) { await p.goto(SITE + u, { waitUntil: 'networkidle2' }); await sleep(1200); }

(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  for (const kind of ONLY) {
    const plan = kind.startsWith('free') ? 'free' : kind;
    const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1400, height: 1000 });
    await p.evaluateOnNewDocument(() => { localStorage.setItem('pf_pro_trial_dialog_dismissed_v1', '1'); window.__copied = []; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied.push(t); } } }); });
    p.on('dialog', d => d.accept());
    await go(p, '/login');
    await p.type('input[type=email]', rd(`/tmp/qa/${kind}.email`)); await p.type('input[type=password]', rd(`/tmp/qa/${kind}.pw`));
    await p.click('button[type=submit]'); await sleep(4500);

    if (kind === 'free') {
      // Account that already used its 5 runs today: limit must show and Run must be disabled.
      await p.evaluate(() => { const k = 'promptforge-storage'; const s = JSON.parse(localStorage.getItem(k) || '{"state":{"prompts":[]},"version":0}'); s.state.prompts = [{ id: 'qa-limit', title: 'QA limite', content: 'Escreve uma frase sobre café.', description: '', category: 'other', tags: [], outputType: 'text', targetModel: 'generic', variables: [], versions: [{ id: 'v1', promptId: 'qa-limit', content: 'Escreve uma frase sobre café.', createdAt: new Date().toISOString() }], currentVersionId: 'v1', isFavorite: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]; localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem('pf_lang', 'pt'); });
      await go(p, '/library/qa-limit?tab=run'); await sleep(2500);
      const L = await p.evaluate(() => ({ limit: document.querySelector('[data-testid=run-limit]')?.innerText || '', disabled: document.querySelector('[data-testid=run-button]')?.disabled, quota: document.querySelector('[data-testid=run-quota]')?.innerText }));
      ok('[free/pt] daily run limit reached -> message + disabled', /5 execuções de hoje/.test(L.limit) && L.disabled === true && /0 de 5/.test(L.quota || ''), JSON.stringify(L));
      await p.screenshot({ path: `${OUT}/run_limit_free_pt.png` });
      await p.evaluate(() => localStorage.setItem('pf_lang', 'en')); await go(p, '/library/qa-limit?tab=run'); await sleep(2500);
      const L2 = await p.evaluate(() => document.querySelector('[data-testid=run-limit]')?.innerText || '');
      ok('[free/en] daily run limit message EN', /used all 5 runs/.test(L2) && /Pro gives 100\/day/.test(L2), L2);
      await p.screenshot({ path: `${OUT}/run_limit_free_en.png` });
      await ctx.close(); continue;
    }

    for (const lang of ['pt', 'en']) {
      const T = `[${plan}/${lang}]`;
      await p.evaluate(l => localStorage.setItem('pf_lang', l), lang);
      await p.setViewport({ width: 1400, height: 1000 });
      // ---- NAV
      await go(p, '/');
      const nav = await p.evaluate(() => [...document.querySelectorAll('aside nav a')].map(a => a.innerText.trim()).filter(Boolean));
      ok(`${T} sidebar has 5 items`, JSON.stringify(nav) === JSON.stringify(NAVL[lang]), JSON.stringify(nav));
      await p.screenshot({ path: `${NAV}/sidebar_${plan}_${lang}_desktop.png` });
      // redirects
      for (const [from, re] of [['/quick', /^\/create\?mode=quick$/], ['/builder', /^\/create\?mode=guided$/], ['/optimizer', /^\/create\?mode=optimize$/], ['/tester', /^\/library(\/[\w-]+\?tab=test|\?hint=test)$/], ['/versions', /^\/library(\/[\w-]+\?tab=versions|\?hint=versions)$/]]) {
        await go(p, from); const u = await path(p);
        ok(`${T} redirect ${from}`, re.test(u), u);
      }
      // legacy redirect forwards router state (old "Experimenta já" deep link to /optimizer)
      await go(p, '/');
      await p.evaluate(() => { window.history.pushState({ usr: { prefill: 'QA-PREFILL-LEGACY' }, key: 'qa', idx: 1 }, '', '/optimizer'); window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state })); });
      await sleep(1500);
      const lg = await p.evaluate(() => ({ u: location.pathname + location.search, v: [...document.querySelectorAll('textarea')].map(t => t.value).join('|') }));
      ok(`${T} /optimizer + state -> Create optimize prefilled`, lg.u === '/create?mode=optimize' && lg.v.includes('QA-PREFILL-LEGACY'), JSON.stringify(lg));
      // Create tabs
      await go(p, '/create?mode=quick');
      const modes = await p.evaluate(() => [...document.querySelectorAll('[data-testid=create-modes] button')].map(b => b.innerText.trim()));
      ok(`${T} Create has Rápido/Detalhado/Otimizar`, lang === 'pt' ? modes.join('|') === 'Rápido|Detalhado|Otimizar prompt existente' : modes.join('|') === 'Quick|Detailed|Optimise existing prompt', modes.join('|'));
      await p.click('[data-testid=mode-guided]'); await sleep(600);
      ok(`${T} toggle -> guided`, (await path(p)) === '/create?mode=guided' && !!(await p.$('[data-testid=panel-guided]')));
      await p.screenshot({ path: `${NAV}/create_guided_${plan}_${lang}.png` });
      await p.click('[data-testid=mode-optimize]'); await sleep(600);
      ok(`${T} toggle -> optimize`, (await path(p)) === '/create?mode=optimize' && !!(await p.$('[data-testid=panel-optimize] textarea')));
      await p.screenshot({ path: `${NAV}/create_optimize_${plan}_${lang}.png` });
      // lesson deep links
      await go(p, '/learn/anatomia-prompt'); await p.waitForSelector('[data-testid=lesson-try] input', { timeout: 15000 });
      await (await p.$('[data-testid=lesson-try] input')).type('Padaria QA'); await sleep(200);
      await p.click('[data-testid=open-builder]'); await sleep(2000);
      const lb = await p.evaluate(() => ({ u: location.pathname + location.search, v: document.querySelector('textarea')?.value || '' }));
      ok(`${T} lesson -> Criar (guided) prefilled`, lb.u === '/create?mode=guided' && lb.v.includes('Padaria QA'), JSON.stringify({ u: lb.u, v: lb.v.slice(0, 50) }));
      await go(p, '/learn/anatomia-prompt'); await p.waitForSelector('[data-testid=lesson-try] input', { timeout: 15000 });
      await (await p.$('[data-testid=lesson-try] input')).type('Padaria QA2'); await sleep(200);
      await p.click('[data-testid=open-optimizer]'); await sleep(2000);
      const lo = await p.evaluate(() => ({ u: location.pathname + location.search, v: [...document.querySelectorAll('textarea')].map(t => t.value).join('|') }));
      ok(`${T} lesson -> Otimizar prefilled`, lo.u === '/create?mode=optimize' && lo.v.includes('Padaria QA2'), lo.u);

      if (lang === 'pt') {
        // ---- BRAND KIT
        await go(p, '/brand'); await sleep(800);
        // clean previous QA brands from earlier runs of this script
        while (await p.$('[data-testid=brand-delete]')) { await p.click('[data-testid=brand-delete]'); await sleep(1200); }
        const brandName = `Pastelaria Doce Braga ${plan}`;
        await p.click('[data-testid=brand-new]'); await p.waitForSelector('[data-testid=brand-form]');
        await p.type('#b-name', brandName); await p.type('#b-off', 'Pastéis de nata e bolos artesanais em Braga'); await p.type('#b-aud', 'Famílias e escritórios de Braga');
        await p.type('#b-tone', 'Próximo e simples'); await p.type('#b-kw', 'massa-mãe, fresco'); await p.type('#b-fw', 'barato, low-cost');
        await p.click('[data-testid=brand-save]'); await sleep(2000);
        const bk = await p.evaluate(() => ({ cards: document.querySelectorAll('[data-testid=brand-card]').length, active: document.querySelectorAll('[data-testid=brand-card][data-active="1"]').length, canNew: !!document.querySelector('[data-testid=brand-new]'), limit: !!document.querySelector('[data-testid=brand-limit]'), count: document.querySelector('[data-testid=brand-count]')?.innerText }));
        ok(`${T} brand created + active`, bk.cards === 1 && bk.active === 1, JSON.stringify(bk));
        ok(`${T} brand limit after 1 (${plan})`, plan === 'free' ? bk.limit && !bk.canNew : bk.canNew && !bk.limit, JSON.stringify(bk));
        if (plan !== 'free') {
          for (const n of [2, 3, 4]) {
            if (!(await p.$('[data-testid=brand-new]'))) break;
            await p.click('[data-testid=brand-new]'); await p.waitForSelector('[data-testid=brand-form]'); await p.type('#b-name', `QA marca ${n}`); await p.click('[data-testid=brand-save]'); await sleep(1800);
          }
          const bk2 = await p.evaluate(() => ({ cards: document.querySelectorAll('[data-testid=brand-card]').length, canNew: !!document.querySelector('[data-testid=brand-new]'), limit: !!document.querySelector('[data-testid=brand-limit]') }));
          ok(`${T} brand limit ${plan === 'pro' ? '3' : 'unlimited'}`, plan === 'pro' ? bk2.cards === 3 && bk2.limit && !bk2.canNew : bk2.cards === 4 && bk2.canNew, JSON.stringify(bk2));
          // keep only the first brand (active)
          for (let i = 0; i < 3; i++) { const dels = await p.$$('[data-testid=brand-card][data-active="0"] [data-testid=brand-delete]'); if (!dels.length) break; await dels[0].click(); await sleep(1300); }
        }
        await p.screenshot({ path: `${OUT}/brand_${plan}_pt.png` });
        // ---- QUICK with brand + save + run
        await go(p, '/create?mode=quick'); await sleep(1500);
        const sel = await p.evaluate(() => document.querySelector('[data-testid=brand-selector]')?.innerText || '');
        ok(`${T} brand selector shows active brand`, sel.includes('Pastelaria Doce Braga'), sel.replace(/\n/g, ' '));
        await p.type('textarea', 'um post de Instagram para o fim de semana');
        await clickText(p, 'button', /Gerar|Generate/); 
        try {
          await p.waitForSelector('[data-testid=generated-prompt]', { timeout: 90000 });
          const gp = await p.$eval('[data-testid=generated-prompt]', e => e.innerText);
          ok(`${T} quick prompt uses brand (server-side)`, /Doce Braga/i.test(gp) && /barato|low-cost/i.test(gp), gp.slice(0, 120).replace(/\n/g, ' '));
          await p.screenshot({ path: `${OUT}/quick_brand_${plan}_pt.png`, fullPage: true });
          await p.click('[data-testid=save-library]'); await sleep(1500);
          const du = await path(p);
          ok(`${T} save -> prompt detail page`, /^\/library\/[\w-]+$/.test(du), du);
          // ---- DETAIL TABS
          const tabs = await p.evaluate(() => [...document.querySelectorAll('[data-testid=detail-tabs] button')].map(b => b.innerText.trim()));
          ok(`${T} detail tabs`, tabs.join('|') === 'Executar|Otimizar|Testar|Versões', tabs.join('|'));
          const q0 = await p.$eval('[data-testid=run-quota]', e => e.innerText).catch(() => '');
          await p.click('[data-testid=run-button]');
          await p.waitForSelector('[data-testid=run-result-text]', { timeout: 90000 });
          const rr = await p.evaluate(() => ({ t: document.querySelector('[data-testid=run-result-text]').innerText, q: document.querySelector('[data-testid=run-quota]')?.innerText, md: /\*\*|^#+ /m.test(document.querySelector('[data-testid=run-result-text]').innerText) }));
          ok(`${T} Executar shows plain-text result + quota`, rr.t.length > 20 && !rr.md && /de (5|100|300)/.test(rr.q), `${q0} -> ${rr.q} | ${rr.t.slice(0, 60).replace(/\n/g, ' ')}`);
          await p.click('[data-testid=run-copy]'); await sleep(300);
          ok(`${T} copy result`, (await p.evaluate(() => window.__copied.at(-1) || '')).length > 20);
          await p.screenshot({ path: `${OUT}/detail_run_${plan}_pt.png`, fullPage: true });
          await p.click('[data-testid=tab-optimize]'); await sleep(800);
          const ov = await p.evaluate(() => document.querySelector('[data-testid=detail-panel-optimize] textarea')?.value || '');
          ok(`${T} detail Otimizar prefilled`, ov.length > 20);
          await p.click('[data-testid=tab-test]'); await sleep(800);
          const tv = await p.evaluate(() => ({ ta: [...document.querySelectorAll('[data-testid=detail-panel-test] textarea')].map(t => t.value.length), txt: document.querySelector('[data-testid=detail-panel-test]').innerText.slice(0, 200) }));
          ok(`${T} detail Testar (${plan === 'free' ? 'upsell' : 'A prefilled'})`, plan === 'free' ? tv.ta.length === 0 && /Pro|Premium/.test(tv.txt) : tv.ta[0] > 20, JSON.stringify(tv.ta));
          await p.screenshot({ path: `${OUT}/detail_test_${plan}_pt.png` });
          await p.click('[data-testid=tab-versions]'); await sleep(800);
          const vv = await p.evaluate(() => document.querySelector('[data-testid=detail-panel-versions]').innerText.slice(0, 200));
          ok(`${T} detail Versões (${plan === 'free' ? 'upsell' : 'list'})`, plan === 'free' ? /Pro|Premium/.test(vv) : /Versão inicial|Versão 1|Atual/.test(vv), vv.replace(/\n/g, ' ').slice(0, 80));
          // mobile detail
          await p.click('[data-testid=tab-run]'); await sleep(300);
          await p.setViewport({ width: 390, height: 844, isMobile: true }); await sleep(1200);
          ok(`${T} detail mobile no overflow`, !(await overflow(p)));
          await p.screenshot({ path: `${NAV}/detail_${plan}_pt_mobile.png`, fullPage: true });
          await p.setViewport({ width: 1400, height: 1000 }); await sleep(800);
        } catch (e) { ok(`${T} quick/detail flow`, false, e.message); }
        // library cards
        await go(p, '/library');
        const lc = await p.evaluate(() => ({ n: document.querySelectorAll('[data-testid=library-card]').length, run: !!document.querySelector('[data-testid=library-run]') }));
        ok(`${T} library cards open detail tabs`, lc.n >= 1 && lc.run, JSON.stringify(lc));
        await p.screenshot({ path: `${NAV}/library_${plan}_pt.png` });
      }
      if (lang === 'en') {
        await go(p, '/brand'); await sleep(800);
        const be = await p.evaluate(() => document.body.innerText);
        ok(`${T} Brand Kit page EN`, /Make the AI write like your brand/.test(be) && /profiles used/.test(be));
        await p.screenshot({ path: `${OUT}/brand_${plan}_en.png` });
        await go(p, '/library'); 
        const first = await p.$('[data-testid=library-open]');
        if (first) {
          await first.click(); await sleep(1200);
          const tabs = await p.evaluate(() => [...document.querySelectorAll('[data-testid=detail-tabs] button')].map(b => b.innerText.trim()));
          ok(`${T} detail tabs EN`, tabs.join('|') === 'Run|Optimise|Test|Versions', tabs.join('|'));
          await p.screenshot({ path: `${NAV}/detail_${plan}_en.png` });
        }
      }
      // mobile nav sheet
      await p.setViewport({ width: 390, height: 844, isMobile: true }); await go(p, '/create?mode=quick');
      ok(`${T} create mobile no overflow`, !(await overflow(p)));
      await p.screenshot({ path: `${NAV}/create_quick_${plan}_${lang}_mobile.png` });
      const menuBtn = await p.$('button.fixed'); if (menuBtn) { await menuBtn.click(); await sleep(800); }
      const mnav = await p.evaluate(() => [...document.querySelectorAll('[role=dialog] nav a')].map(a => a.innerText.trim()).filter(Boolean));
      ok(`${T} mobile menu 5 items`, JSON.stringify(mnav) === JSON.stringify(NAVL[lang]), JSON.stringify(mnav));
      await p.screenshot({ path: `${NAV}/menu_${plan}_${lang}_mobile.png` });
      await p.keyboard.press('Escape'); await sleep(300);
    }
    // pack template run with brand (premium: full pack; free: free templates)
    if (plan !== 'pro') {
      await p.setViewport({ width: 1400, height: 1000 }); await p.evaluate(() => localStorage.setItem('pf_lang', 'pt'));
      await go(p, '/packs/hospitality'); await sleep(2500);
      const filler = await p.$('[data-testid=template-filler]');
      if (!filler) ok(`[${plan}] pack template present`, false);
      else {
        const inputs = await filler.$$('input, textarea'); for (const i of inputs) await i.type('Ericeira');
        await sleep(300);
        const runBtn = await filler.$('[data-testid=template-run]');
        await runBtn.click();
        try {
          await p.waitForSelector('[role=dialog] [data-testid=run-result-text]', { timeout: 90000 });
          const pr = await p.evaluate(() => ({ t: document.querySelector('[role=dialog] [data-testid=run-result-text]').innerText, brand: document.querySelector('[role=dialog] [data-testid=run-brand]')?.innerText || '' }));
          ok(`[${plan}/pt] pack template Executar with brand`, pr.t.length > 20 && /Doce Braga/.test(pr.brand), `${pr.brand} | ${pr.t.slice(0, 60).replace(/\n/g, ' ')}`);
          await p.screenshot({ path: `${OUT}/pack_run_${plan}_pt.png` });
        } catch (e) { ok(`[${plan}/pt] pack template Executar`, false, e.message); }
        await p.keyboard.press('Escape');
      }
    }
    // pro: optimizer with brand + run selected version + save as version
    if (plan === 'pro') {
      await p.setViewport({ width: 1400, height: 1000 }); await p.evaluate(() => localStorage.setItem('pf_lang', 'en'));
      await go(p, '/library'); const first = await p.$('[data-testid=library-open]');
      if (first) {
        await first.click(); await sleep(1000); await p.click('[data-testid=tab-optimize]'); await sleep(800);
        await clickText(p, '[data-testid=detail-panel-optimize] button', /Optimize Prompt/);
        try {
          await p.waitForSelector('[data-testid=optimizer-save-version]', { timeout: 120000 });
          await p.click('[data-testid=optimizer-save-version]'); await sleep(1200);
          await p.click('[data-testid=tab-versions]'); await sleep(800);
          const vv = await p.evaluate(() => document.querySelector('[data-testid=detail-panel-versions]').innerText);
          ok('[pro/en] optimiser -> save as new version', /Optimised:/.test(vv), vv.replace(/\n/g, ' ').slice(0, 120));
          await p.click('[data-testid=tab-test]'); await sleep(800);
          const tv = await p.evaluate(() => [...document.querySelectorAll('[data-testid=detail-panel-test] textarea')].map(t => t.value.length));
          ok('[pro/en] Test tab: A=current, B=previous version', tv[0] > 20 && tv[1] > 20, JSON.stringify(tv));
          await p.screenshot({ path: `${OUT}/detail_test_after_version_pro_en.png` });
        } catch (e) { ok('[pro/en] optimiser in detail', false, e.message); }
      }
    }
    await ctx.close();
  }
  // anon
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1400, height: 1000 });
  await p.evaluateOnNewDocument(() => { localStorage.setItem('pf_pro_trial_dialog_dismissed_v1', '1'); localStorage.setItem('pf_lang', 'pt'); });
  await go(p, '/');
  const nav = await p.evaluate(() => [...document.querySelectorAll('aside nav a')].map(a => a.innerText.trim()).filter(Boolean));
  ok('[anon/pt] sidebar 5 items', JSON.stringify(nav) === JSON.stringify(NAVL.pt), JSON.stringify(nav));
  await go(p, '/tester'); ok('[anon] /tester -> /library?hint=test', (await path(p)) === '/library?hint=test' && !!(await p.$('[data-testid=library-hint]')));
  await p.screenshot({ path: `${NAV}/library_hint_anon_pt.png` });
  await go(p, '/brand'); ok('[anon] /brand asks to sign up', /Cria uma conta grátis para guardares a tua marca/.test(await p.evaluate(() => document.body.innerText)));
  await b.close();
  console.log(`\n${results.filter(r => r.startsWith('PASS')).length} pass, ${results.filter(r => r.startsWith('FAIL')).length} fail`);
  fs.writeFileSync(OUT + '/results.txt', results.join('\n') + '\n');
})();
