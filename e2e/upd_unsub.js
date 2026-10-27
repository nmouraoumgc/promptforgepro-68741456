const puppeteer = require('puppeteer-core'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const NEW = 'index-DieXiUhw.js', TK = '17af5a5f-c2bc-4224-abb8-e45271c92f1a';
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true });
  await p.goto('https://promptforgepro.me/', { waitUntil: 'networkidle2' }); await sleep(3000);
  const before = await p.evaluate(() => [...document.scripts].map(s => s.src).find(s => s.includes('/assets/')));
  console.log('tab opened on:', before);
  // wait for new deploy
  for (let i = 0; i < 20; i++) { const t = await (await fetch('https://promptforgepro.me/?x=' + Date.now())).text(); if (t.includes(NEW)) break; await sleep(10000); }
  await p.evaluate(() => window.dispatchEvent(new Event('focus'))); await sleep(6000);
  const after = await p.evaluate(() => [...document.scripts].map(s => s.src).find(s => s.includes('/assets/')));
  console.log((before.includes(NEW) ? 'SKIP (tab already new)' : after.includes(NEW) ? 'PASS' : 'FAIL') + ' open tab auto-reloaded to new build:', after);
  console.log('caches:', JSON.stringify(await p.evaluate(() => caches.keys())));
  for (const lang of ['pt', 'en']) {
    await p.evaluate(l => localStorage.setItem('pf_lang', l), lang);
    await p.goto('https://promptforgepro.me/unsubscribe?t=' + TK, { waitUntil: 'networkidle2' }); await sleep(1500);
    const s1 = await p.$eval('[data-testid=unsub-state]', e => e.innerText);
    await p.screenshot({ path: `/workspace/pfp/features_v4/prod/unsubscribe_${lang}.png` });
    await p.click('[data-testid=unsub-confirm]'); await sleep(1500);
    const s2 = await p.$eval('[data-testid=unsub-state]', e => e.innerText);
    await p.screenshot({ path: `/workspace/pfp/features_v4/prod/unsubscribe_done_${lang}.png` });
    await p.click('[data-testid=unsub-undo]'); await sleep(1500);
    const s3 = await p.$eval('[data-testid=unsub-state]', e => e.innerText);
    console.log(`[${lang}]`, /Queres deixar|Stop receiving/.test(s1) && /Feito|Done/.test(s2) && /Queres deixar|Stop receiving/.test(s3) ? 'PASS' : 'FAIL', 'unsubscribe page confirm + undo |', s2);
  }
  await p.goto('https://promptforgepro.me/unsubscribe?t=bad', { waitUntil: 'networkidle2' }); await sleep(1200);
  console.log('invalid token:', await p.$eval('[data-testid=unsub-state]', e => e.innerText));
  await b.close();
})();
