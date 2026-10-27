import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { usePromptStore } from '@/stores/promptStore';
import { loadLibrary, remapLocalPrompts, uploadPrompts, setLibraryErrorHandler, LOCAL_BACKUP_KEY } from '@/data/libraryDb';
import { useToast } from '@/hooks/use-toast';
import { isEnglishNow } from '@/i18n/lang';
import type { Prompt } from '@/types/prompt';

// Module-level guard: one import/load per user at a time, even if the layout remounts.
let inflight: string | null = null;

function readBackup(): Prompt[] {
  try { const raw = localStorage.getItem(LOCAL_BACKUP_KEY); return raw ? (JSON.parse(raw) as Prompt[]) : []; } catch { return []; }
}

/** Keeps the prompt library in Supabase for signed-in users.
 *  On first sign-in on a device, prompts stored locally are imported once and then cleared from localStorage. */
export function LibrarySync() {
  const uid = useAuthStore((s) => s.user?.id ?? null);
  const authLoading = useAuthStore((s) => s.isLoading);
  const { toast } = useToast();
  const running = useRef<string | null>(null);

  useEffect(() => {
    setLibraryErrorHandler(() => toast({
      title: isEnglishNow() ? 'Could not save to your library' : 'Não foi possível guardar na biblioteca',
      description: isEnglishNow() ? 'Check your connection and try again.' : 'Verifica a ligação e tenta novamente.',
      variant: 'destructive',
    }));
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    const store = usePromptStore.getState();
    if (!uid) {
      running.current = null;
      if (store.syncUserId) store.setLibrary([], null, 'local');
      return;
    }
    if (running.current === uid || inflight === uid) return;
    running.current = uid; inflight = uid;
    (async () => {
      // Prompts only in this browser (signed-out use or the pre-DB app), plus any unfinished earlier import.
      const localOnly = store.syncUserId ? [] : store.prompts;
      const backup = readBackup();
      const seen = new Set(backup.map((p) => p.id));
      const pending = [...backup, ...(await remapLocalPrompts(localOnly, uid)).filter((p) => !seen.has(p.id))];
      if (pending.length) localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(pending));
      // Switching to synced mode drops prompts from the persisted localStorage state.
      store.setLibrary(pending, uid, 'loading');
      try {
        if (pending.length) {
          await uploadPrompts(pending);
          localStorage.removeItem(LOCAL_BACKUP_KEY);
          toast({ title: isEnglishNow() ? `${pending.length} prompt(s) moved to your account` : `${pending.length} prompt(s) movidos para a tua conta` });
        }
        const prompts = await loadLibrary();
        if (running.current === uid) usePromptStore.getState().setLibrary(prompts, uid, 'ready');
      } catch {
        if (running.current === uid) usePromptStore.getState().setLibrary(usePromptStore.getState().prompts, uid, 'error');
        toast({ title: isEnglishNow() ? 'Could not load your library' : 'Não foi possível carregar a biblioteca', variant: 'destructive' });
      } finally { inflight = null; }
    })();
  }, [uid, authLoading, toast]);

  return null;
}
