// DB persistence for the prompt library (tables library_prompts / library_prompt_versions, own-row RLS).
// The zustand store stays the in-memory cache; when a user is signed in every mutation
// is queued here and written to Supabase in order.
import { supabase } from '@/integrations/supabase/client';
import type { Prompt, PromptVersion } from '@/types/prompt';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s?: string | null) => !!s && UUID_RE.test(s);
export const newId = () => crypto.randomUUID();

interface PromptRow {
  id: string; title: string; content: string; description: string | null; category: string; tags: string[];
  output_type: string; target_model: string | null; tone: string | null; variables: unknown; score: unknown;
  feedback: unknown; current_version_id: string | null; is_favorite: boolean; created_at: string; updated_at: string;
}
interface VersionRow { id: string; prompt_id: string; content: string; label: string | null; created_at: string }

export function toRow(p: Prompt) {
  return {
    id: p.id, title: (p.title || '').slice(0, 300), content: p.content, description: p.description ?? null,
    category: p.category ?? 'other', tags: p.tags ?? [], output_type: p.outputType ?? 'text',
    target_model: p.targetModel ?? null, tone: p.tone ?? null, variables: p.variables ?? [],
    score: p.score ?? null, feedback: p.feedback ?? null,
    current_version_id: isUuid(p.currentVersionId) ? p.currentVersionId : null,
    is_favorite: !!p.isFavorite,
    created_at: new Date(p.createdAt).toISOString(), updated_at: new Date(p.updatedAt).toISOString(),
  };
}
const versionRow = (v: PromptVersion) => ({
  id: v.id, prompt_id: v.promptId, content: v.content, label: v.label ?? null, created_at: new Date(v.createdAt).toISOString(),
});

function fromRows(r: PromptRow, versions: VersionRow[]): Prompt {
  return {
    id: r.id, title: r.title, content: r.content, description: r.description ?? undefined,
    category: r.category as Prompt['category'], tags: r.tags ?? [], outputType: r.output_type as Prompt['outputType'],
    targetModel: (r.target_model ?? undefined) as Prompt['targetModel'], tone: (r.tone ?? undefined) as Prompt['tone'],
    variables: (r.variables as Prompt['variables']) ?? [], score: (r.score as Prompt['score']) ?? undefined,
    feedback: (r.feedback as Prompt['feedback']) ?? undefined,
    versions: versions.map((v) => ({ id: v.id, promptId: v.prompt_id, content: v.content, label: v.label ?? undefined, createdAt: new Date(v.created_at) })),
    currentVersionId: r.current_version_id ?? undefined, isFavorite: r.is_favorite,
    createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export async function loadLibrary(): Promise<Prompt[]> {
  const { data: rows, error } = await db.from('library_prompts').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  const { data: vers, error: ve } = await db.from('library_prompt_versions').select('id,prompt_id,content,label,created_at').order('created_at', { ascending: true });
  if (ve) throw ve;
  const byPrompt = new Map<string, VersionRow[]>();
  for (const v of (vers ?? []) as VersionRow[]) { const a = byPrompt.get(v.prompt_id) ?? []; a.push(v); byPrompt.set(v.prompt_id, a); }
  return ((rows ?? []) as PromptRow[]).map((r) => fromRows(r, byPrompt.get(r.id) ?? []));
}

// Serialised write queue so a version insert never races its prompt insert.
let queue: Promise<unknown> = Promise.resolve();
let onError: ((e: unknown) => void) | null = null;
export const setLibraryErrorHandler = (fn: (e: unknown) => void) => { onError = fn; };
function enqueue(op: () => Promise<{ error: unknown } | void>) {
  queue = queue.then(async () => {
    try { const r = await op(); if (r && r.error) throw r.error; } catch (e) { onError?.(e); }
  });
  return queue;
}
export const flushLibraryWrites = () => queue;

export const remote = {
  upsertPrompt: (p: Prompt) => enqueue(() => db.from('library_prompts').upsert(toRow(p))),
  insertVersions: (vs: PromptVersion[]) => vs.length ? enqueue(() => db.from('library_prompt_versions').insert(vs.map(versionRow))) : Promise.resolve(),
  deletePrompt: (id: string) => enqueue(() => db.from('library_prompts').delete().eq('id', id)),
};

/** Deterministic UUID (v5-style, SHA-1) so re-running an import for the same user never duplicates. */
async function stableUuid(ns: string, name: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${ns}:${name}`))).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x50; h[8] = (h[8] & 0x3f) | 0x80;
  const x = [...h].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

/** Gives prompts kept in this browser (pre-DB) ids derived from (user, old id), so the import is idempotent. */
export async function remapLocalPrompts(local: Prompt[], userId: string): Promise<Prompt[]> {
  const out: Prompt[] = [];
  for (const p of local) {
    const id = isUuid(p.id) ? p.id : await stableUuid(userId, `p:${p.id}`);
    const src = p.versions?.length ? p.versions : [{ id: `${p.id}-v0`, promptId: p.id, content: p.content, createdAt: p.createdAt }];
    const versions: PromptVersion[] = [];
    for (const v of src) versions.push({ ...v, id: isUuid(v.id) ? v.id : await stableUuid(userId, `v:${p.id}:${v.id}`), promptId: id });
    const oldCurrent = src.findIndex((v) => v.id === p.currentVersionId);
    out.push({ ...p, id, versions, currentVersionId: oldCurrent >= 0 ? versions[oldCurrent].id : undefined });
  }
  return out;
}

/** Uploads already-remapped prompts; safe to retry (prompt upsert, versions insert-or-ignore). */
export async function uploadPrompts(prompts: Prompt[]): Promise<void> {
  for (const p of prompts) {
    const { error } = await db.from('library_prompts').upsert(toRow(p));
    if (error) throw error;
    const { error: ve } = await db.from('library_prompt_versions').upsert(p.versions.map(versionRow), { onConflict: 'id', ignoreDuplicates: true });
    if (ve) throw ve;
  }
}

export const LOCAL_BACKUP_KEY = 'promptforge-library-import';
