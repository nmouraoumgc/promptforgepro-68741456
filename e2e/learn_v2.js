const puppeteer = require('puppeteer-core'); const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = '/workspace/pfp/learn_tests/v2'; fs.mkdirSync(OUT, { recursive: true });
const SITE = 'https://promptforgepro.me';
const FREE = ['anatomia-prompt', 'contexto-negocio', 'formato-certo', 'iterar'];
const results = []; const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n}${x ? ' | ' + x : ''}`);
const rd = f => fs.readFileSync(f, 'utf8').trim();
async function cards(p) {
  const res = {};
  for (const t of ['fundamentos', 'setor', 'avancado']) {
    await p.click(`[data-testid=track-${t}]`); await sleep(400);
    Object.assign(res, await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-testid=lesson-card]')].map(c => [c.dataset.slug, c.dataset.locked]))));
  }
  await p.click('[data-testid=track-fundamentos]'); await sleep(300);
  return res;
}
async function dash(p) {
  await p.goto(SITE + '/', { waitUntil: 'networkidle2' }); await sleep(2500);
  return p.evaluate(() => {
    const c = document.querySelector('[data-testid=onboarding-checklist]');
    if (!c) return null;
    return { count: document.querySelector('[data-testid=onboarding-count]').innerText, steps: [...c.querySelectorAll('[data-testid^=onboarding-step-]')].map(s => s.dataset.testid.replace('onboarding-step-', '') + ':' + s.dataset.done), text: c.innerText.slice(0, 400) };
  });
}
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  for (const kind of ['free', 'pro', 'premium']) {
    const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1400, height: 1000 });
    await p.evaluateOnNewDocument(() => { localStorage.setItem('pf_pro_trial_dialog_dismissed_v1', '1'); });
    await p.goto(SITE + '/login', { waitUntil: 'networkidle2' });
    await p.type('input[type=email]', rd(`/tmp/qa/${kind}.email`)); await p.type('input[type=password]', rd(`/tmp/qa/${kind}.pw`));
    await p.click('button[type=submit]'); await sleep(4500);
    const entitled = kind !== 'free';
    for (const lang of ['pt', 'en']) {
      const T = `[${kind}/${lang}]`;
      await p.evaluate(l => localStorage.setItem('pf_lang', l), lang);
      await p.setViewport({ width: 1400, height: 1000 });
      // Dashboard checklist
      const d = await dash(p);
      ok(`${T} dashboard checklist shown`, !!d && d.steps.length === 4 && d.steps[0].startsWith('learn'), JSON.stringify(d && { count: d.count, steps: d.steps }));
      if (d) ok(`${T} checklist language`, lang === 'pt' ? /Faz a lição 1/.test(d.text) && /Começa em 4 passos/.test(d.text) : /Take lesson 1/.test(d.text) && /Get started in 4/.test(d.text));
      if (d) ok(`${T} 4th step by plan`, d.steps[3].startsWith(entitled ? 'compare' : 'favorite'), d.steps[3]);
      await p.screenshot({ path: `${OUT}/dashboard_${kind}_${lang}_desktop.png` });
      // Learn list
      await p.goto(SITE + '/learn', { waitUntil: 'networkidle2' }); await p.waitForSelector('[data-testid=lesson-card]', { timeout: 15000 });
      const c = await cards(p);
      const slugs = Object.keys(c); const lockedS = slugs.filter(s => c[s] === '1');
      ok(`${T} 18 lessons listed`, slugs.length === 18, `n=${slugs.length}`);
      ok(`${T} locked count`, lockedS.length === (entitled ? 0 : 14) && (entitled || FREE.every(s => c[s] === '0')), `locked=${lockedS.length}`);
      const info = await p.evaluate(() => ({ up: document.querySelector('[data-testid=learn-upsell]')?.innerText || '', body: document.body.innerText }));
      ok(`${T} upsell banner`, entitled ? !info.up : /14/.test(info.up), info.up.split('\n')[0]);
      ok(`${T} Fundamentals desc mentions 4 free`, lang === 'pt' ? /As 4 primeiras lições são grátis/.test(info.body) : /first 4 lessons are free/.test(info.body));
      await p.screenshot({ path: `${OUT}/learn_${kind}_${lang}_desktop.png` });
      // lesson 4 free
      await p.goto(SITE + '/learn/iterar', { waitUntil: 'networkidle2' }); await p.waitForSelector('[data-testid=lesson]', { timeout: 15000 }); await sleep(500);
      ok(`${T} lesson 4 (iterar) unlocked`, await p.$eval('[data-testid=lesson]', e => e.dataset.locked) === '0');
      // lesson 5 + ex-free sector lesson
      for (const s of ['erros-comuns', 'ganchos-reels', 'prompts-imagens']) {
        await p.goto(SITE + '/learn/' + s, { waitUntil: 'networkidle2' }); await p.waitForSelector('[data-testid=lesson]', { timeout: 15000 }); await sleep(700);
        const P = await p.evaluate(() => ({ locked: document.querySelector('[data-testid=lesson]').dataset.locked, upsell: document.querySelector('[data-testid=lesson-upsell]')?.getAttribute('href') || null, alts: [...document.querySelectorAll('[data-testid=lesson-free-alternatives] a')].map(a => a.getAttribute('href')), steps: document.querySelectorAll('[data-testid=lesson-steps] li').length, problem: !!document.querySelector('[data-testid=lesson-problem]') }));
        ok(`${T} ${s} ${entitled ? 'unlocked' : 'locked+upsell+4 free links'}`, entitled ? P.locked === '0' && P.steps === 3 : P.locked === '1' && P.upsell === '/pricing' && P.alts.length === 4 && !P.problem, JSON.stringify(P));
        if (!entitled && s === 'erros-comuns') {
          await p.screenshot({ path: `${OUT}/lesson5_locked_free_${lang}_desktop.png` });
          await p.setViewport({ width: 390, height: 844, isMobile: true }); await sleep(1200);
          ok(`${T} locked lesson mobile no overflow`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
          await p.screenshot({ path: `${OUT}/lesson5_locked_free_${lang}_mobile.png`, fullPage: true });
          await p.setViewport({ width: 1400, height: 1000 }); await sleep(800);
        }
      }
      // pricing text
      await p.goto(SITE + '/pricing', { waitUntil: 'networkidle2' }); await sleep(1500);
      const pr = await p.evaluate(() => document.body.innerText);
      ok(`${T} pricing mentions free lessons`, lang === 'pt' ? pr.includes('4 lições grátis do Aprender') && pr.includes('Todas as lições do Aprender') : pr.includes('4 free Learn lessons') && pr.includes('All Learn lessons'));
      if (kind === 'free') await p.screenshot({ path: `${OUT}/pricing_free_${lang}.png` });
    }
    // Complete lesson 1 -> checklist step ticks and persists (DB)
    await p.evaluate(() => localStorage.setItem('pf_lang', 'pt'));
    await p.goto(SITE + '/learn/anatomia-prompt', { waitUntil: 'networkidle2' }); await p.waitForSelector('[data-testid=lesson-complete]', { timeout: 15000 }); await sleep(800);
    if (await p.$eval('[data-testid=lesson-complete]', e => e.dataset.done) === '0') { await p.click('[data-testid=lesson-complete]'); await sleep(2000); }
    let d = await dash(p);
    ok(`[${kind}] lesson1 ticks checklist`, d && d.steps[0] === 'learn:1' && /^1\/4/.test(d.count), JSON.stringify(d && d.steps));
    // clear local cache: progress must come back from DB
    await p.evaluate(() => { localStorage.removeItem('onboarding-completed'); localStorage.removeItem('onboarding-dismissed'); });
    d = await dash(p);
    ok(`[${kind}] checklist progress restored from DB`, d && d.steps[0] === 'learn:1', JSON.stringify(d && d.steps));
    await p.screenshot({ path: `${OUT}/dashboard_${kind}_pt_after_lesson1.png` });
    if (kind === 'free') {
      await p.setViewport({ width: 390, height: 844, isMobile: true }); await sleep(1500);
      ok(`[free/pt] dashboard mobile no overflow`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
      await p.screenshot({ path: `${OUT}/dashboard_free_pt_mobile.png` });
      await p.setViewport({ width: 1400, height: 1000 }); await sleep(800);
      // Optimizer -> "Aprender a melhorar" for free user
      await p.goto(SITE + '/optimizer', { waitUntil: 'networkidle2' }); await sleep(1000);
      const ta = await p.$('textarea'); await ta.type('escreve um texto sobre o meu negócio');
      const btn = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => /Otimizar Prompt/.test(b.innerText))); await btn.click();
      try {
        await p.waitForSelector('[data-testid=learn-improve]', { timeout: 90000 }); await sleep(800);
        const li = await p.$eval('[data-testid=learn-improve]', a => ({ href: a.getAttribute('href'), locked: a.dataset.locked, txt: a.innerText }));
        const el = await p.$('[data-testid=learn-improve]'); await el.scrollIntoView(); await sleep(300);
        await p.screenshot({ path: `${OUT}/optimizer_free_pt_learn_link.png` });
        const slug = li.href.split('/').pop();
        ok(`[free/pt] optimizer learn link lock flag matches`, (li.locked === '1') === !FREE.includes(slug), JSON.stringify(li));
        await p.click('[data-testid=learn-improve]'); await sleep(2500);
        const land = await p.evaluate(() => ({ url: location.pathname, locked: document.querySelector('[data-testid=lesson]')?.dataset.locked, lockCard: !!document.querySelector('[data-testid=lesson-locked]') }));
        ok(`[free/pt] optimizer -> lesson lands cleanly`, land.url === li.href && (FREE.includes(slug) ? land.locked === '0' : land.lockCard), JSON.stringify(land));
      } catch (e) { ok('[free/pt] optimizer learn link', false, e.message); }
      // force paid target: open erros-comuns via optimizer-like deep link
      // dismiss checklist persists
      await dash(p);
      await p.click('[data-testid=onboarding-dismiss]'); await sleep(1500);
      await p.evaluate(() => { localStorage.removeItem('onboarding-dismissed'); });
      d = await dash(p);
      ok(`[free] dismiss persisted (DB)`, d === null);
      await p.screenshot({ path: `${OUT}/dashboard_free_pt_dismissed.png` });
    }
    await ctx.close();
  }
  // anon: dashboard checklist (local) and lesson 5 locked
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1400, height: 1000 });
  await p.evaluateOnNewDocument(() => { localStorage.setItem('pf_pro_trial_dialog_dismissed_v1', '1'); localStorage.setItem('pf_lang', 'en'); });
  const d = await dash(p); ok('[anon/en] checklist shown', !!d, JSON.stringify(d && d.steps));
  await p.goto(SITE + '/learn/erros-comuns', { waitUntil: 'networkidle2' }); await p.waitForSelector('[data-testid=lesson]'); await sleep(600);
  ok('[anon/en] lesson 5 locked', await p.$eval('[data-testid=lesson]', e => e.dataset.locked) === '1');
  await b.close();
  console.log(results.join('\n'));
  console.log(`\n${results.filter(r => r.startsWith('PASS')).length} pass, ${results.filter(r => r.startsWith('FAIL')).length} fail`);
})();
