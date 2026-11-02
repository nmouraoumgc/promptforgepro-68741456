const puppeteer = require('puppeteer-core'); const fs = require('fs'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
 for (const kind of ['premium','free']) { const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1400, height: 1000 });
 await p.evaluateOnNewDocument(() => { localStorage.setItem('pf_pro_trial_dialog_dismissed_v1','1'); localStorage.setItem('pf_lang','pt'); });
 await p.goto('https://promptforgepro.me/login', { waitUntil: 'networkidle2' });
 await p.type('input[type=email]', fs.readFileSync(`/tmp/qa/${kind}.email`,'utf8').trim()); await p.type('input[type=password]', fs.readFileSync(`/tmp/qa/${kind}.pw`,'utf8').trim());
 await p.click('button[type=submit]'); await sleep(4000);
 for (const slug of ['hospitality','tiktok']) {
  await p.goto(`https://promptforgepro.me/packs/${slug}`, { waitUntil: 'networkidle2' }); await sleep(2500);
  const tabs = await p.$$('[role=tab]'); const seen = new Set(); let braces = 0;
  for (const t of tabs) { await t.click(); await sleep(700);
    const r = await p.evaluate(() => ({ ids: [...document.querySelectorAll('[data-testid=template-filler] [data-testid=template-text]')].map(e => e.innerText.slice(0,40)), br: (document.body.innerText.match(/\{\{/g)||[]).length })); r.ids.forEach(x => seen.add(x)); braces += r.br; }
  console.log(`[${kind}] ${slug}: tabs=${tabs.length} templates-with-form=${seen.size} raw{{=${braces}`);
  if (kind==='premium' && slug==='hospitality') await p.screenshot({ path: '/workspace/pfp/plaintext_tests/tpl_premium_pt_lasttab.png' });
 } await ctx.close(); } await b.close(); })();
