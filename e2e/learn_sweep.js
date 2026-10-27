const puppeteer = require('puppeteer-core'); const fs = require('fs'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const slugs = ['anatomia-prompt','contexto-negocio','formato-certo','iterar','erros-comuns','ganchos-reels','anuncios-ab','avaliacoes-google','newsletter-mensal','propostas-orcamentos','follow-up-clientes','anuncio-imovel','leads-imobiliario','anuncio-alojamento','mensagens-hospedes','exemplos-no-prompt','criar-template','prompts-imagens'];
(async () => { const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
 const p = await (await b.createBrowserContext()).newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true });
 await p.evaluateOnNewDocument(() => localStorage.setItem('pf_pro_trial_dialog_dismissed_v1', '1'));
 await p.goto('https://promptforgepro.me/login', { waitUntil: 'networkidle2' });
 await p.type('input[type=email]', fs.readFileSync('/tmp/qa/premium.email', 'utf8')); await p.type('input[type=password]', fs.readFileSync('/tmp/qa/premium.pw', 'utf8'));
 await p.click('button[type=submit]'); await sleep(4000); let bad = 0;
 for (const lang of ['pt', 'en']) { await p.evaluate(l => localStorage.setItem('pf_lang', l), lang);
  for (const s of slugs) { await p.goto('https://promptforgepro.me/learn/' + s, { waitUntil: 'networkidle2' }); await p.waitForSelector('[data-testid=lesson-tips]', { timeout: 15000 }).catch(() => {});
   const r = await p.evaluate(() => { const txt = document.querySelector('article')?.innerText || ''; const humanised = [...document.querySelectorAll('[data-testid=lesson-try] label')].map(l => l.innerText);
     return { sec: ['problem','steps','before-after','try','checklist','tips'].filter(x => document.querySelector(`[data-testid=lesson-${x}]`)).length, braces: (txt.match(/\{\{/g) || []).length, fields: humanised.length, labels: humanised.join(', '), ov: document.documentElement.scrollWidth > innerWidth + 1,
       ptLeak: document.documentElement.lang === 'en' && /\b(não|para o teu|Escreve|Dá-me)\b/.test(txt), enLeak: document.documentElement.lang !== 'en' && /\b(Write|the|your|Plain text)\b/.test(txt) }; });
   const good = r.sec === 6 && (r.braces === 0 || s === 'criar-template') && !r.ov && !r.ptLeak && !r.enLeak && r.fields >= 2;
   if (!good) bad++; console.log(`${good ? 'OK ' : 'BAD'} ${lang} ${s.padEnd(22)} sec=${r.sec} {{=${r.braces} fields=${r.fields} ov=${r.ov} leak=${r.ptLeak || r.enLeak} | ${r.labels}`); } }
 console.log('bad:', bad); await b.close(); })();
