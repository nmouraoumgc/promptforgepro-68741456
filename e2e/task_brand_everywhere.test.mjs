import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Create modes expose per-task brand selector', () => {
  for (const name of ['QuickPrompt', 'GuidedBuilder', 'PromptOptimizer']) {
    assert.match(read(`src/pages/${name}.tsx`), /<TaskBrandSelector/);
  }
});

test('Run prompt exposes a brand/no-brand selector and sends the choice', () => {
  const source = read('src/components/run/RunPrompt.tsx');
  assert.match(source, /<TaskBrandSelector request=\{prompt\}/);
  assert.match(source, /taskBrand\.requestBrand/);
  assert.match(source, /useBrand: false, brandId: null/);
  assert.doesNotMatch(source, /withBrand=\{withBrand\} autoRun/);
});

test('Pack preview exposes a task-local selector and sends the choice', () => {
  const source = read('src/components/packs/PackPreview.tsx');
  assert.match(source, /<TaskBrandSelector className="pt-2" request=\{tema\}/);
  assert.match(source, /\.\.\.taskBrand\.requestBrand/);
  assert.doesNotMatch(source, /<BrandSelector/);
});

test('Backend honours the per-task brand ID without changing account defaults', () => {
  for (const name of ['run-prompt', 'generate-pack-preview']) {
    const source = read(`supabase/functions/${name}/index.ts`);
    assert.match(source, /resolveTaskBrand\(auth\.userId, \{ useBrand, brandId \}\)/);
    assert.match(source, /language: reqLanguage/);
  }
});
