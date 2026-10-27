import { useAuthStore } from '@/stores/authStore';
import { usePromptStore } from '@/stores/promptStore';

/** True while auth is resolving or a signed-in library is still loading from the DB. */
export function useLibraryLoading() {
  const authLoading = useAuthStore((s) => s.isLoading);
  const status = usePromptStore((s) => s.libraryStatus);
  const syncUserId = usePromptStore((s) => s.syncUserId);
  const uid = useAuthStore((s) => s.user?.id ?? null);
  return authLoading || status === 'loading' || (!!uid && syncUserId !== uid);
}
