// Auto-saved drafts of the prompt being edited (input plus generated results), per user and
// per screen, kept in localStorage for 24 hours. Saving to the library stays a manual action.
import { useEffect, useRef, useState } from 'react';

const PREFIX = 'pfp_draft_v1:';
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const keyFor = (userId: string, scope: string) => `${PREFIX}${userId}:${scope}`;

/** Drop expired or unreadable drafts (any user). */
export function sweepDrafts() {
  try {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      try {
        const v = JSON.parse(localStorage.getItem(k) || 'null');
        if (!v || typeof v.savedAt !== 'number' || now - v.savedAt > DRAFT_TTL_MS) localStorage.removeItem(k);
      } catch { localStorage.removeItem(k); }
    }
  } catch { /* storage unavailable */ }
}

export function loadDraft<T>(userId: string | undefined | null, scope: string): T | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(keyFor(userId, scope));
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v.savedAt !== 'number' || Date.now() - v.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(keyFor(userId, scope));
      return null;
    }
    return v.data as T;
  } catch { return null; }
}

export function saveDraft<T>(userId: string | undefined | null, scope: string, data: T) {
  if (!userId) return;
  try { localStorage.setItem(keyFor(userId, scope), JSON.stringify({ savedAt: Date.now(), data })); } catch { /* quota or private mode */ }
}

export function clearDraft(userId: string | undefined | null, scope: string) {
  if (!userId) return;
  try { localStorage.removeItem(keyFor(userId, scope)); } catch { /* ignore */ }
}

/** Remove every draft (used on sign-out so a shared device does not keep them). */
export function clearAllDrafts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}

/**
 * Persist `data` (debounced) while `isEmpty` is false; an empty state removes the draft.
 */
export function useDraftAutosave<T>(userId: string | undefined | null, scope: string, data: T, isEmpty: boolean, enabled = true) {
  const first = useRef(true);
  useEffect(() => {
    if (!enabled || !userId) return;
    // Skip the very first render so restoring never rewrites the timestamp by itself.
    if (first.current) { first.current = false; return; }
    const id = window.setTimeout(() => {
      if (isEmpty) clearDraft(userId, scope); else saveDraft(userId, scope, data);
    }, 400);
    return () => window.clearTimeout(id);
  }, [userId, scope, data, isEmpty, enabled]);
}

/** Read a draft once, on first render. */
export function useInitialDraft<T>(userId: string | undefined | null, scope: string, enabled = true): T | null {
  const [d] = useState<T | null>(() => {
    if (!enabled) return null;
    sweepDrafts();
    return loadDraft<T>(userId, scope);
  });
  return d;
}
