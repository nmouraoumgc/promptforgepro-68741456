import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('running a prompt preserves explicitly selected UI language over brand default', () => {
  const source = read('supabase/functions/run-prompt/index.ts');
  assert.match(source, /reqLanguage\.trim\(\)\.toLowerCase\(\)/);
  assert.match(source, /brand\?\.language \?\? 'pt'/);
  assert.doesNotMatch(source, /const language = brand\?\.language \?\? reqLanguage/);
  assert.match(source, /outputLanguageRules\(language\)/);
});

test('pack previews preserve selected language over brand default', () => {
  const source = read('supabase/functions/generate-pack-preview/index.ts');
  assert.match(source, /reqLanguage\.trim\(\)\.toLowerCase\(\)/);
  assert.doesNotMatch(source, /const language = brand\?\.language \?\? reqLanguage/);
  assert.match(source, /outputLanguageRules\(language\)/);
});

test('frontend explicitly sends the selected language in both flows', () => {
  for (const path of ['src/components/run/RunPrompt.tsx', 'src/components/packs/PackPreview.tsx']) {
    assert.match(read(path), /language: isEnglish \? 'en' : 'pt'/);
  }
});

test('TikTok hook generator supports English and Portuguese without hardcoded PT rules', () => {
  const source = read('supabase/functions/generate-hooks/index.ts');
  assert.match(source, /language: reqLanguage/);
  assert.match(source, /outputLanguageRules\(language\)/);
  assert.match(source, /The assistant is a specialist in viral TikTok content/);
  assert.doesNotMatch(source, /systemPrompt \+ PT_PT_RULES/);
});

test('brand language remains a fallback for old clients without an explicit language', () => {
  for (const name of ['run-prompt', 'generate-pack-preview']) {
    const source = read(`supabase/functions/${name}/index.ts`);
    assert.match(source, /brand\?\.language \?\? 'pt'/);
  }
});
