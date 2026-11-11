// SEO regression checks for generated public lesson HTML. Run after npm run build.
// This deliberately reads static files, not the client-rendered DOM.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dist = path.resolve(process.env.OUT_DIR || 'dist');
const slugs = ['anatomia-prompt', 'contexto-negocio', 'formato-certo', 'iterar'];
const checks = [];
for (const slug of slugs) {
  for (const [suffix, lang] of [['', 'pt-PT'], ['-en', 'en']]) {
    const file = path.join(dist, 'learn', slug, suffix ? 'en.html' : 'index.html');
    assert.ok(fs.existsSync(file), `Missing static SEO page: ${file}`);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, new RegExp(`<html[^>]+lang="${lang}"`, 'i'), `Wrong HTML language: ${file}`);
    assert.match(html, /<title>[^<]{10,}<\\/title>/i, `Missing meaningful title: ${file}`);
    assert.match(html, /<meta[^>]+name="description"[^>]+content="[^"]{40,}"/i, `Missing description: ${file}`);
    assert.match(html, /<link[^>]+rel="canonical"/i, `Missing canonical: ${file}`);
    assert.match(html, /hreflang="pt-PT"/i);
    assert.match(html, /hreflang="en"/i);
    assert.match(html, /data-testid="lesson-steps"/, `Lesson body not in static HTML: ${file}`);
    assert.doesNotMatch(html, /data-testid="lesson-locked"/, `Locked content leaked: ${file}`);
    checks.push(file);
  }
}
console.log(`SEO lesson HTML checks passed: ${checks.length} variants`);
