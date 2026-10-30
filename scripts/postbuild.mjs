// Post-build steps for the static Vercel deploy:
// 1) dist/vercel.json = repo vercel.json minus build-only keys (the deploy uploads prebuilt files).
// 2) Prerender public routes to static HTML with headless Chrome (skip with PRERENDER=0).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const DIST = path.resolve(process.env.OUT_DIR || 'dist');
const cfg = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
for (const k of ['$schema', 'framework', 'buildCommand', 'outputDirectory', 'installCommand']) delete cfg[k];
fs.writeFileSync(path.join(DIST, 'vercel.json'), JSON.stringify(cfg, null, 2) + '\n');
console.log('postbuild: wrote dist/vercel.json');

// The untouched SPA shell for app routes (index.html becomes the prerendered landing).
const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
fs.writeFileSync(path.join(DIST, 'spa.html'), shell);

if (process.env.PRERENDER === '0') { console.log('postbuild: prerender skipped'); process.exit(0); }

const ROUTES = ['/', '/pricing', '/terms', '/privacy', '/refunds', '/signup', '/login'];
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; } catch { /* optional */ }
if (!CHROME || !puppeteer) { console.warn('postbuild: no Chrome/puppeteer-core, prerender skipped'); process.exit(0); }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  let f = path.join(DIST, decodeURIComponent(u.pathname));
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'spa.html');
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
try {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    // Render logged out, without analytics/payments/backend side effects.
    page.on('request', (r) => (new URL(r.url()).origin === base || r.url().startsWith('data:') ? r.continue() : r.abort()));
    await page.evaluateOnNewDocument(() => { try { localStorage.setItem('pf_lang', 'pt'); } catch { /* ignore */ } });
    await page.goto(base + route, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction(() => document.getElementById('root')?.children.length > 0 && !document.querySelector('[aria-busy="true"]'), { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1200)); // let entry animations settle
    const html = await page.evaluate(() => {
      // Make the DOM look like React server output, so hydrateRoot can claim it:
      // 1) Suspense boundary markers (<!--$--> ... <!--/$-->) around each resolved boundary.
      const rootEl = document.getElementById('root');
      const key = Object.keys(rootEl).find((k) => k.startsWith('__reactContainer$'));
      const hostNodes = (fiber) => {
        const out = [];
        const walk = (f) => {
          for (let c = f; c; c = c.sibling) {
            if (c.tag === 5 || c.tag === 6) out.push(c.stateNode);
            else if (c.tag !== 4) walk(c.child); // skip portals
          }
        };
        walk(fiber);
        return out;
      };
      const visit = (f) => {
        for (let c = f; c; c = c.sibling) {
          if (c.tag === 13 && c.memoizedState === null) {
            const nodes = hostNodes(c.child);
            if (nodes.length) {
              nodes[0].parentNode.insertBefore(document.createComment('$'), nodes[0]);
              const last = nodes[nodes.length - 1];
              last.parentNode.insertBefore(document.createComment('/$'), last.nextSibling);
            }
          }
          visit(c.child);
        }
      };
      if (key) visit(rootEl[key].child);
      // 2) Separate adjacent text nodes like renderToString does.
      const tw = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
      const texts = []; while (tw.nextNode()) texts.push(tw.currentNode);
      for (const t of texts) if (t.previousSibling && t.previousSibling.nodeType === 3) t.parentNode.insertBefore(document.createComment(' '), t);
      const head = document.head.cloneNode(true);
      // Keep only build-time scripts (entry module, theme script, JSON-LD); drop runtime-injected ones.
      head.querySelectorAll('script').forEach((s) => {
        const keep = (s.type === 'module' && (s.getAttribute('src') || '').startsWith('/assets/'))
          || s.type === 'application/ld+json'
          || (!s.src && (s.textContent || '').includes('promptforge-storage'))
          || (s.getAttribute('src') || '').startsWith('/_vercel/');
        if (!keep) s.remove();
      });
      head.querySelectorAll('link[rel="stylesheet"][href^="https://fonts.googleapis.com"]').forEach((l) => l.remove());
      const tc = head.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', '#0f172a');
      const root = document.getElementById('root');
      return `<!doctype html>\n<html lang="pt-PT">\n${head.outerHTML}\n<body>\n<div id="root" data-prerendered="1">${root.innerHTML}</div>\n</body>\n</html>\n`;
    });
    const out = route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, route.slice(1), 'index.html');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    console.log(`postbuild: prerendered ${route} -> ${path.relative(DIST, out)} (${html.length} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
