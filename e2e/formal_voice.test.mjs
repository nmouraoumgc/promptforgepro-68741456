import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('PT and EN system rules require formal third-person output', () => {
  const rules = read('supabase/functions/_shared/ptpt.ts');
  assert.match(rules, /Não trates o leitor por "tu"/);
  assert.match(rules, /terceira pessoa/);
  assert.match(rules, /third-person or impersonal style/);
  assert.match(rules, /Preserva|Preserve|Preserve explicitly/);
});

test('prompt generation and optimization apply the shared voice rules for both languages', () => {
  for (const name of ['generate-prompt', 'quick-prompt', 'optimize-prompt']) {
    const file = read(`supabase/functions/${name}/index.ts`);
    assert.match(file, /import \{ outputLanguageRules \} from ['"]\.\.\/_shared\/ptpt\.ts['"]/);
    assert.match(file, /systemPrompt \+ outputLanguageRules\(language\)/);
    assert.doesNotMatch(file, /systemPrompt \+ PT_PT_RULES/);
  }
});

test('pack previews, testing, prompt execution and hooks use shared language policy', () => {
  for (const name of ['generate-pack-preview', 'run-prompt', 'test-prompts']) {
    assert.match(read(`supabase/functions/${name}/index.ts`), /outputLanguageRules\(language\)/);
  }
  assert.match(read('supabase/functions/generate-hooks/index.ts'), /systemPrompt \+ PT_PT_RULES/);
});

test('pack preview UI does not display informal Portuguese second-person copy', () => {
  const preview = read('src/components/packs/PackPreview.tsx');
  assert.doesNotMatch(preview, /Estás a ver|Desbloqueia o pack|o teu tema|Ao desbloquear recebes/);
});

test('revised pack catalogue removes informal language from the affected templates', () => {
  const catalogue = read('supabase/proposals/packs_src/data3.py');
  assert.doesNotMatch(catalogue, /da tua experiência|sentimos a tua falta|from your experience|"we miss you"/);
  assert.match(catalogue, /Utilizar a terceira pessoa e um tom profissional/);
});
