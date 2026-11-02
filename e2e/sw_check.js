const puppeteer = require('puppeteer-core'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  const p = await b.newPage();
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  await p.setViewport({ width: 390, height: 844, isMobile: true });
  await p.goto('https://promptforgepro.me/', { waitUntil: 'networkidle2' }); await sleep(4000);
  await p.reload({ waitUntil: 'networkidle2' }); await sleep(2000);
  const r = await p.evaluate(async () => ({ ctrl: navigator.serviceWorker.controller?.scriptURL, caches: await caches.keys(), html: document.documentElement.innerHTML.includes('index-DtKMUmoE') }));
  console.log(JSON.stringify(r));
  await p.screenshot({ path: '/workspace/pfp/features_v4/sw_mobile_home.png' });
  await b.close();
})();
