// Runs the actual Edge handler offline. All external modules and provider calls are injected.
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';
export async function loadEdge(file, { auth, rpc, fetch: transport, resolveBrand = async () => null, realAuth = false, clientFactory, exportedModule = false } = {}) {
  let handler;
  const context = vm.createContext({ Request, Response, Headers, AbortSignal, TextEncoder, crypto: webcrypto,
    console: { log() {}, error() {} }, fetch: transport || (() => { throw new Error('Unexpected network request'); }),
    Deno: { env: { get: (key) => ({ GROQ_API_KEY: 'LOCAL_FAKE', SUPABASE_URL: 'https://qa.invalid', SUPABASE_SERVICE_ROLE_KEY: 'LOCAL_FAKE' })[key] } } });
  const cache = new Map();
  const synthetic = (id, exports) => new vm.SyntheticModule(Object.keys(exports), function () { for (const [k, v] of Object.entries(exports)) this.setExport(k, v); }, { context, identifier: id });
  async function load(id) {
    if (cache.has(id)) return cache.get(id);
    let mod;
    if (id.startsWith('https://deno.land/x/xhr')) mod = synthetic(id, {});
    else if (id.startsWith('https://deno.land/std')) mod = synthetic(id, { serve: fn => { handler = fn; } });
    else if (id.startsWith('https://esm.sh/@supabase/')) mod = synthetic(id, { createClient: clientFactory ?? (() => ({ rpc })) });
    else if (id.endsWith('/_shared/auth.ts') && !realAuth) mod = synthetic(id, { corsHeaders: {}, authenticateRequest: async () => auth });
    else if (id.endsWith('/_shared/brand.ts')) mod = synthetic(id, { resolveTaskBrand: resolveBrand, BrandSelectionError: class BrandSelectionError extends Error {}, loadActiveBrand: async () => null, brandInstructions: () => '' });
    else {
      const source = await fs.readFile(id, 'utf8');
      const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
      mod = new vm.SourceTextModule(js, { context, identifier: id });
    }
    cache.set(id, mod);
    await mod.link((specifier, parent) => load(specifier.startsWith('https:') ? specifier : path.resolve(path.dirname(parent.identifier), specifier)));
    return mod;
  }
  const mod = await load(path.resolve(file)); await mod.evaluate();
  return exportedModule ? mod.namespace : handler;
}
