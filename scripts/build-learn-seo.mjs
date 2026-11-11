// Build-time static SEO pages for the four public lessons. No browser or privileged credentials.
// The build intentionally fails if the public RLS API does not expose a free lesson.
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve(process.env.OUT_DIR || 'dist');
const site = 'https://promptforgepro.me';
const slugs = ['anatomia-prompt', 'contexto-negocio', 'formato-certo', 'iterar'];
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing public Supabase build variables for SEO lessons');
const base = new URL(url);
if (base.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS');
const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = async (table, query) => {
  const endpoint = new URL('/rest/v1/' + table, base);
  for (const [k,v] of Object.entries(query)) endpoint.searchParams.set(k,v);
  const r = await fetch(endpoint, {headers:{apikey:key,authorization:'Bearer '+key,accept:'application/json'},signal:AbortSignal.timeout(20000)});
  if (!r.ok) throw new Error('Anonymous lesson fetch failed: '+table+' HTTP '+r.status);
  const rows = await r.json();
  if (!Array.isArray(rows)) throw new Error('Unexpected public lesson response');
  return rows;
};
const styles = `body{margin:0;background:#0a0a0d;color:#eee;font:16px/1.65 system-ui,-apple-system,sans-serif}main{max-width:850px;margin:auto;padding:32px 22px 90px}header{border-bottom:1px solid #30303a;padding:18px 22px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}a{color:#bba7ff}h1{font-size:clamp(30px,5vw,46px);line-height:1.2}h2{margin-top:40px;color:#e8dfff}section{border-bottom:1px solid #292932;padding-bottom:20px}li{margin:12px 0}blockquote,pre{background:#17171e;border:1px solid #32323c;border-radius:12px;padding:18px;white-space:pre-wrap;overflow-wrap:anywhere}p{overflow-wrap:anywhere}.muted{color:#bbb}nav{display:flex;gap:14px}`;
const item = (s) => '<li>'+escape(s)+'</li>';
function page(lesson, body, en) {
  const slug = lesson.slug, lang = en?'en':'pt-PT';
  const title = lesson[en?'title_en':'title_pt'], desc = lesson[en?'summary_en':'summary_pt'];
  if (!title || !desc || !body || !Array.isArray(body.steps) || body.steps.length===0) throw new Error('Incomplete public lesson: '+slug+' '+lang);
  const canonical = site+'/learn/'+slug+(en?'?lang=en':'');
  const pt = site+'/learn/'+slug, english=pt+'?lang=en';
  const sections = [
    '<section><h2>'+(en?'The problem':'O problema')+'</h2><p>'+escape(body.problem)+'</p></section>',
    '<section data-testid="lesson-steps"><h2>'+(en?'The method in 3 steps':'O método em 3 passos')+'</h2><ol>'+body.steps.map(s=>'<li><strong>'+escape(s.title)+'</strong><p>'+escape(s.text)+'</p></li>').join('')+'</ol></section>',
    '<section><h2>'+(en?'Before and after':'Antes e depois')+'</h2><h3>'+(en?'Weak prompt':'Prompt fraco')+'</h3><blockquote>'+escape(body.before?.prompt)+'</blockquote><p>'+escape(body.before?.note)+'</p><h3>'+(en?'Strong prompt':'Prompt forte')+'</h3><blockquote>'+escape(body.after?.prompt)+'</blockquote><p>'+escape(body.after?.note)+'</p></section>',
    '<section><h2>'+(en?'Try it now':'Experimenta já')+'</h2><p>'+escape(body.try?.intro)+'</p><pre>'+escape(body.try?.template)+'</pre></section>',
    '<section><h2>Checklist</h2><ul>'+(body.checklist||[]).map(item).join('')+'</ul></section>',
    '<section><h2>'+(en?'Tips':'Sugestões')+'</h2>'+ (body.tips||[]).map(t=>'<h3>'+escape(t.title)+'</h3><p>'+escape(t.text)+'</p>').join('')+'</section>'
  ].join('\n');
  return `<!doctype html><html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | PromptForge Pro</title><meta name="description" content="${escape(desc)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${escape(canonical)}"><link rel="alternate" hreflang="pt-PT" href="${pt}"><link rel="alternate" hreflang="en" href="${english}"><link rel="alternate" hreflang="x-default" href="${pt}"><meta property="og:title" content="${escape(title)} | PromptForge Pro"><meta property="og:description" content="${escape(desc)}"><meta property="og:locale" content="${en?'en_US':'pt_PT'}"><meta property="og:url" content="${escape(canonical)}"><style>${styles}</style></head><body><header><strong><a href="/">PromptForge Pro</a></strong><nav><a href="/learn${en?'?lang=en':''}">${en?'All lessons':'Todas as lições'}</a><a href="${en?pt:english}">${en?'Português':'English'}</a></nav></header><main><article data-testid="lesson" data-locked="0"><p class="muted">${en?'Free lesson':'Lição gratuita'}</p><h1>${escape(title)}</h1><p class="muted">${escape(desc)}</p>${sections}</article><p><a href="/signup${en?'?lang=en':''}">${en?'Create free account':'Criar conta gratuita'}</a> · <a href="/pricing${en?'?lang=en':''}">Pro</a></p></main></body></html>`;
}
for (const slug of slugs) {
  const lessons = await read('learn_lessons',{select:'id,slug,title_pt,title_en,summary_pt,summary_en,is_free,is_active',slug:'eq.'+slug,is_free:'eq.true',is_active:'eq.true'});
  if (lessons.length!==1 || lessons[0].is_free!==true) throw new Error('Free lesson unavailable: '+slug);
  const l=lessons[0];
  const contents=await read('learn_lesson_content',{select:'body_pt,body_en',lesson_id:'eq.'+l.id});
  if(contents.length!==1) throw new Error('Free lesson body unavailable: '+slug);
  const dir=path.join(out,'learn',slug);fs.mkdirSync(dir,{recursive:true});
  for (const [en,file] of [[false,'index.html'],[true,'en.html']]) {
    const raw=contents[0][en?'body_en':'body_pt'];
    const body=typeof raw==='string'?JSON.parse(raw):raw;
    fs.writeFileSync(path.join(dir,file),page(l,body,en));
  }
  console.log('SEO: generated PT/EN free lesson '+slug);
}
