const puppeteer = require('puppeteer-core'); const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = '/workspace/pfp/plaintext_tests';
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  for (const kind of ['free', 'premium']) {
    const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1400, height: 1000 });
    await p.evaluateOnNewDocument(() => { localStorage.setItem('pf_pro_trial_dialog_dismissed_v1', '1'); window.__copied = []; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied.push(t); } } }); });
    await p.goto('https://promptforgepro.me/login', { waitUntil: 'networkidle2' });
    await p.type('input[type=email]', fs.readFileSync(`/tmp/qa/${kind}.email`, 'utf8').trim());
    await p.type('input[type=password]', fs.readFileSync(`/tmp/qa/${kind}.pw`, 'utf8').trim());
    await p.click('button[type=submit]'); await sleep(4000);
    for (const lang of ['pt', 'en']) {
      await p.evaluate(l => localStorage.setItem('pf_lang', l), lang);
      await p.setViewport({ width: 1400, height: 1000 });
      await p.goto('https://promptforgepro.me/packs/hospitality', { waitUntil: 'networkidle2' }); await sleep(3000);
      const info = await p.evaluate(() => ({
        fillers: document.querySelectorAll('[data-testid=template-filler]').length,
        rawBraces: (document.body.innerText.match(/\{\{/g) || []).length,
        labels: [...document.querySelectorAll('[data-testid=template-filler]')][0] ? [...document.querySelectorAll('[data-testid=template-filler]')[0].querySelectorAll('label')].map(l => l.innerText) : [],
        placeholders: [...document.querySelectorAll('[data-testid=template-filler] input, [data-testid=template-filler] textarea')].slice(0, 3).map(i => i.placeholder),
        marks: [...document.querySelectorAll('[data-testid=template-filler] mark[data-filled="0"]')].slice(0, 3).map(m => m.innerText),
        locked: document.querySelector('[data-testid=locked-templates]')?.innerText ?? null,
        premiumTitle: /Mensagens automáticas para hóspedes|Automated guest messages/.test(document.body.innerText),
      }));
      console.log(`[${kind}/${lang}]`, JSON.stringify(info));
      // fill only the first field, then copy
      const first = await p.$('[data-testid=template-filler] input, [data-testid=template-filler] textarea');
      const val = lang === 'pt' ? 'Ericeira' : 'Cornwall';
      await first.type(val); await sleep(300);
      const preview = await p.evaluate(() => document.querySelector('[data-testid=template-filler] [data-testid=template-text]').innerText);
      await p.evaluate(() => { const f = document.querySelector('[data-testid=template-filler]'); [...f.querySelectorAll('button')].pop().click(); });
      await sleep(600);
      const res = await p.evaluate(() => ({ copied: window.__copied.at(-1), hint: document.querySelector('[data-testid=copy-hint]')?.innerText }));
      console.log(`[${kind}/${lang}] live preview has value: ${preview.includes(val)} | copied: ${JSON.stringify(res.copied)} | hint: ${JSON.stringify(res.hint)}`);
      await p.screenshot({ path: `${OUT}/tpl_${kind}_${lang}_desktop.png` });
      await p.setViewport({ width: 390, height: 844, isMobile: true }); await sleep(800);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      const el = await p.waitForSelector('[data-testid=template-filler]', { timeout: 15000 }); await el.scrollIntoView(); await sleep(300);
      await p.screenshot({ path: `${OUT}/tpl_${kind}_${lang}_mobile.png` });
      console.log(`[${kind}/${lang}] mobile horizontal overflow: ${overflow}`);
    }
    if (kind === 'premium') {
      // Library: inject a user prompt with variables and check readable rendering
      await p.setViewport({ width: 1400, height: 1000 });
      await p.evaluate(() => { const k = 'promptforge-storage'; const s = JSON.parse(localStorage.getItem(k) || '{"state":{"prompts":[]},"version":0}'); s.state.prompts = [{ id: 'qa1', title: 'QA template', content: 'Escreve um email para {{cliente}} sobre {{projeto}}.', category: 'marketing', tags: [], outputType: 'text', variables: [], versions: [], isFavorite: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...(s.state.prompts || [])]; localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem('pf_lang', 'pt'); });
      await p.goto('https://promptforgepro.me/library', { waitUntil: 'networkidle2' }); await sleep(2000);
      const lib = await p.evaluate(() => [...document.querySelectorAll('[data-testid=template-text]')].map(e => e.innerText).find(t => t.includes('Escreve um email')));
      console.log(`[premium/pt] library card: ${JSON.stringify(lib)}`);
      await p.screenshot({ path: `${OUT}/tpl_library_pt.png` });
    }
    await ctx.close();
  }
  await b.close();
})();
