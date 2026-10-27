const puppeteer = require('puppeteer-core'); const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = '/workspace/pfp/learn_tests'; fs.mkdirSync(OUT, { recursive: true });
const SITE = 'https://promptforgepro.me';
const results = []; const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' | ' + extra : ''}`); };
async function countAllCards(p) {
  let all = 0, locked = 0;
  for (const t of ['fundamentos', 'setor', 'avancado']) {
    await p.click(`[data-testid=track-${t}]`); await sleep(400);
    const r = await p.evaluate(() => ({ n: document.querySelectorAll('[data-testid=lesson-card]').length, l: document.querySelectorAll('[data-testid=lesson-card][data-locked="1"]').length }));
    all += r.n; locked += r.l;
  }
  await p.click('[data-testid=track-fundamentos]'); await sleep(300);
  return { all, locked };
}
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  for (const kind of ['free', 'pro', 'premium']) {
    const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1400, height: 1000 });
    await p.evaluateOnNewDocument(() => { localStorage.setItem('pf_pro_trial_dialog_dismissed_v1', '1'); });
    await p.goto(SITE + '/login', { waitUntil: 'networkidle2' });
    await p.type('input[type=email]', fs.readFileSync(`/tmp/qa/${kind}.email`, 'utf8'));
    await p.type('input[type=password]', fs.readFileSync(`/tmp/qa/${kind}.pw`, 'utf8'));
    await p.click('button[type=submit]'); await sleep(4000);
    const entitled = kind !== 'free';
    for (const lang of ['pt', 'en']) {
      const T = `[${kind}/${lang}]`;
      await p.evaluate(l => localStorage.setItem('pf_lang', l), lang);
      await p.setViewport({ width: 1400, height: 1000 });
      // 1. list
      await p.goto(SITE + '/learn', { waitUntil: 'networkidle2' }); await p.waitForSelector('[data-testid=lesson-card]', { timeout: 15000 });
      const c = await countAllCards(p);
      const meta = await p.evaluate(() => ({ t: document.title, d: document.querySelector('meta[name=description]').content, lang: document.documentElement.lang, up: !!document.querySelector('[data-testid=learn-upsell]'), placeholder: /Em breve|Coming Soon|Secção Learn/.test(document.body.innerText) }));
      ok(`${T} list 18 lessons`, c.all === 18, `cards=${c.all}`);
      ok(`${T} locked cards`, c.locked === (entitled ? 0 : 8), `locked=${c.locked}`);
      ok(`${T} upsell banner`, meta.up === !entitled);
      ok(`${T} no placeholder`, !meta.placeholder);
      ok(`${T} list title/meta`, lang === 'pt' ? meta.t === 'Aprender | PromptForge Pro' && meta.d.startsWith('Lições práticas') && meta.lang === 'pt-PT' : meta.t === 'Learn | PromptForge Pro' && meta.d.startsWith('Practical') && meta.lang === 'en', `${meta.t} / ${meta.d.slice(0, 40)} / ${meta.lang}`);
      if (kind === 'free' || (kind === 'pro' && lang === 'en')) {
        await p.screenshot({ path: `${OUT}/learn_${kind}_${lang}_desktop.png` });
      }
      // 2. free lesson 1
      await p.goto(SITE + '/learn/anatomia-prompt', { waitUntil: 'networkidle2' }); await p.waitForSelector('[data-testid=lesson]', { timeout: 15000 });
      const L = await p.evaluate(() => ({
        locked: document.querySelector('[data-testid=lesson]').dataset.locked,
        sections: ['problem', 'steps', 'before-after', 'try', 'checklist', 'tips'].filter(s => document.querySelector(`[data-testid=lesson-${s}]`)).length,
        steps: document.querySelectorAll('[data-testid=lesson-steps] li').length,
        braces: (document.querySelector('main, body').innerText.match(/\{\{/g) || []).length,
        md: /\*\*|^#+ /m.test(document.body.innerText),
        title: document.title,
      }));
      ok(`${T} lesson1 unlocked + 6 sections + 3 steps`, L.locked === '0' && L.sections === 6 && L.steps === 3, JSON.stringify(L));
      ok(`${T} lesson1 no {{ / markdown`, L.braces === 0 && !L.md);
      ok(`${T} lesson1 dynamic title`, lang === 'pt' ? L.title === 'Anatomia de um bom prompt | PromptForge Pro' : L.title === 'Anatomy of a good prompt | PromptForge Pro', L.title);
      // completion toggle (persisted in DB)
      const before = await p.$eval('[data-testid=lesson-complete]', e => e.dataset.done);
      if (before === '0') { await p.click('[data-testid=lesson-complete]'); await sleep(1500); }
      await p.reload({ waitUntil: 'networkidle2' }); await p.waitForSelector('[data-testid=lesson-complete]');
      await sleep(800);
      const after = await p.$eval('[data-testid=lesson-complete]', e => e.dataset.done);
      ok(`${T} completion persisted`, after === '1', `before=${before} after=${after}`);
      // fill + open in builder
      const val = lang === 'pt' ? 'Pastelaria Doce Braga' : 'Sunrise Bakery';
      const inp = await p.$('[data-testid=lesson-try] input'); await inp.type(val); await sleep(200);
      if (kind === 'free' && lang === 'pt') {
        await p.setViewport({ width: 390, height: 844, isMobile: true }); await sleep(1200);
        await p.waitForSelector('[data-testid=lesson-try]');
        const ov = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        ok(`${T} lesson mobile no overflow`, !ov);
        await p.screenshot({ path: `${OUT}/lesson_free_pt_mobile_top.png` });
        const el = await p.$('[data-testid=lesson-try]'); await el.scrollIntoView(); await sleep(300);
        await p.screenshot({ path: `${OUT}/lesson_free_pt_mobile_try.png` });
        await p.setViewport({ width: 1400, height: 1000 }); await sleep(1200);
        await p.waitForSelector('[data-testid=lesson-try] input');
        const i2 = await p.$('[data-testid=lesson-try] input'); const cur = await p.evaluate(e => e.value, i2); if (!cur) await i2.type(val);
      }
      await p.click('[data-testid=open-builder]'); await sleep(2000);
      const bld = await p.evaluate(() => ({ url: location.pathname, obj: document.querySelector('textarea')?.value || '' }));
      ok(`${T} open in Criar Prompt prefilled`, bld.url === '/builder' && bld.obj.includes(val) && !bld.obj.includes('{{'), `${bld.url} "${bld.obj.slice(0, 70)}"`);
      // 3. paid lesson
      await p.goto(SITE + '/learn/anuncios-ab', { waitUntil: 'networkidle2' }); await p.waitForSelector('[data-testid=lesson]', { timeout: 15000 }); await sleep(500);
      const P = await p.evaluate(() => ({ locked: document.querySelector('[data-testid=lesson]').dataset.locked, upsell: document.querySelector('[data-testid=lesson-upsell]')?.getAttribute('href') || null, steps: document.querySelectorAll('[data-testid=lesson-steps] li').length }));
      ok(`${T} paid lesson ${entitled ? 'unlocked' : 'locked + upsell'}`, entitled ? P.locked === '0' && P.steps === 3 : P.locked === '1' && P.upsell === '/pricing', JSON.stringify(P));
      if (kind === 'free' && lang === 'pt') await p.screenshot({ path: `${OUT}/lesson_paid_locked_free_pt.png` });
      // 4. optimizer target (paid advanced lesson for entitled; free lesson for free)
      const optSlug = entitled ? 'exemplos-no-prompt' : 'formato-certo';
      await p.goto(SITE + '/learn/' + optSlug, { waitUntil: 'networkidle2' }); await p.waitForSelector('[data-testid=open-optimizer]', { timeout: 15000 });
      await (await p.$('[data-testid=lesson-try] input, [data-testid=lesson-try] textarea')).type('QA-TEXT'); await sleep(200);
      await p.click('[data-testid=open-optimizer]'); await sleep(2000);
      const opt = await p.evaluate(() => ({ url: location.pathname, v: [...document.querySelectorAll('textarea')].map(t => t.value).join('') }));
      ok(`${T} open in Optimizer prefilled (${optSlug})`, opt.url === '/optimizer' && opt.v.includes('QA-TEXT'), `${opt.url} "${opt.v.slice(0, 60)}"`);
      if (kind === 'pro' && lang === 'pt') {
        // 5. "Aprender a melhorar" -> lesson
        await p.evaluate(() => { const t = document.querySelector('textarea'); });
        const ta = await p.$('textarea'); await ta.click({ clickCount: 3 }); await p.keyboard.press('Backspace');
        await ta.type('escreve um post sobre o meu café');
        const btn = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => /Otimizar Prompt/.test(b.innerText)));
        await btn.click();
        try {
          await p.waitForSelector('[data-testid=learn-improve]', { timeout: 60000 });
          const href = await p.$eval('[data-testid=learn-improve]', a => a.getAttribute('href'));
          await p.click('[data-testid=learn-improve]'); await sleep(2500);
          const land = await p.evaluate(() => ({ url: location.pathname, ok: !!document.querySelector('[data-testid=lesson-steps]') }));
          ok(`${T} Optimizer "Aprender a melhorar" -> lesson`, /^\/learn\/[a-z-]+$/.test(href) && land.url === href && land.ok, `${href}`);
        } catch (e) { ok(`${T} Optimizer "Aprender a melhorar" -> lesson`, false, e.message); }
      }
    }
    // progress list shows done badge
    await p.goto(SITE + '/learn', { waitUntil: 'networkidle2' }); await p.waitForSelector('[data-testid=lesson-card]');
    const doneTxt = await p.$eval('[data-testid=learn-progress]', e => e.innerText);
    ok(`[${kind}] progress shown`, /1 of 18|1 de 18/.test(doneTxt), doneTxt.replace(/\n/g, ' '));
    if (kind === 'pro') {
      await p.setViewport({ width: 390, height: 844, isMobile: true }); await sleep(1500); await p.waitForSelector('[data-testid=lesson-card]');
      ok(`[pro/en] list mobile no overflow`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
      await p.screenshot({ path: `${OUT}/learn_pro_en_mobile.png` });
    }
    await ctx.close();
  }
  // static page titles (anon) + offline page
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
  for (const lang of ['pt', 'en']) {
    await p.evaluateOnNewDocument(l => localStorage.setItem('pf_lang', l), lang);
    for (const path of ['/packs', '/pricing', '/optimizer']) {
      await p.goto(SITE + path, { waitUntil: 'networkidle2' }); await sleep(500);
      const t = await p.evaluate(() => document.title + ' || ' + document.querySelector('meta[name=description]').content.slice(0, 50));
      results.push(`INFO [anon/${lang}] ${path}: ${t}`);
    }
  }
  await p.goto(SITE + '/offline.html'); results.push('INFO offline.html: ' + await p.evaluate(() => document.querySelector('h1').innerText));
  await b.close();
  console.log(results.join('\n'));
  console.log(`\n${results.filter(r => r.startsWith('PASS')).length} pass, ${results.filter(r => r.startsWith('FAIL')).length} fail`);
})();
