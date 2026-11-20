// Dashboard "first steps" checklist. Progress + dismissal live in user_onboarding (RLS: own row)
// for signed-in users, mirrored in localStorage so visitors and offline use still work.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export type OnboardingStep = 'learn' | 'create' | 'optimize' | 'compare' | 'favorite';
export const ONBOARDING_STEPS: OnboardingStep[] = ['learn', 'create', 'optimize', 'compare', 'favorite'];
// Scope browser progress to the authenticated account. Legacy unscoped keys are
// deliberately not imported: they may belong to another person on this device.
const DONE_KEY = 'onboarding-completed';
const DISMISS_KEY = 'onboarding-dismissed';
const scopedKey = (key: string, userId: string | null) => userId ? `${key}:user:${userId}` : `${key}:guest`;
const EVT = 'pf-onboarding-change';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const uniq = (a: string[]) => Array.from(new Set(a)).filter((s) => (ONBOARDING_STEPS as string[]).includes(s)) as OnboardingStep[];
const currentUserId = () => useAuthStore.getState().user?.id ?? null;
const readLocalDone = (userId: string | null = currentUserId()): OnboardingStep[] => { try { return uniq(JSON.parse(localStorage.getItem(scopedKey(DONE_KEY, userId)) || '[]')); } catch { return []; } };
const readLocalDismissed = (userId: string | null = currentUserId()) => localStorage.getItem(scopedKey(DISMISS_KEY, userId)) === 'true';

async function saveRemote(patch: { completed_steps?: string[]; dismissed?: boolean }) {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;
  const { data } = await db.from('user_onboarding').select('completed_steps, dismissed').eq('user_id', userId).maybeSingle();
  const row = {
    user_id: userId,
    completed_steps: uniq([...(data?.completed_steps || []), ...(patch.completed_steps || [])]),
    dismissed: patch.dismissed ?? data?.dismissed ?? false,
    updated_at: new Date().toISOString(),
  };
  await db.from('user_onboarding').upsert(row, { onConflict: 'user_id' });
}

/** Mark a step done from anywhere (optimizer, tester, lesson 1...). Safe to call repeatedly. */
export function markOnboardingStep(step: OnboardingStep) {
  const userId = currentUserId();
  const cur = readLocalDone(userId);
  if (!cur.includes(step)) localStorage.setItem(scopedKey(DONE_KEY, userId), JSON.stringify([...cur, step]));
  window.dispatchEvent(new Event(EVT));
  saveRemote({ completed_steps: [step] }).catch(() => { /* offline: localStorage keeps it */ });
}

export function useOnboarding(derived: OnboardingStep[]) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [done, setDone] = useState<OnboardingStep[]>(() => readLocalDone(userId));
  const [dismissed, setDismissed] = useState<boolean>(() => readLocalDismissed(userId));
  const [ready, setReady] = useState(!userId);
  const derivedKey = derived.join(',');

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const local = readLocalDone(userId);
      let remoteDone: string[] = [];
      let remoteDismissed = false;
      if (userId) {
        const { data } = await db.from('user_onboarding').select('completed_steps, dismissed').eq('user_id', userId).maybeSingle();
        remoteDone = data?.completed_steps || [];
        remoteDismissed = !!data?.dismissed;
      }
      const merged = uniq([...local, ...remoteDone, ...derived]);
      const isDismissed = userId ? remoteDismissed : readLocalDismissed(userId);
      if (cancelled) return;
      localStorage.setItem(scopedKey(DONE_KEY, userId), JSON.stringify(merged));
      setDone(merged);
      setDismissed(isDismissed);
      setReady(true);
      if (userId && merged.some((s) => !remoteDone.includes(s))) saveRemote({ completed_steps: merged }).catch(() => {});
    };
    sync().catch(() => setReady(true));
    const onChange = () => setDone(readLocalDone(userId));
    window.addEventListener(EVT, onChange);
    return () => { cancelled = true; window.removeEventListener(EVT, onChange); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, derivedKey]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(scopedKey(DISMISS_KEY, userId), 'true');
    saveRemote({ dismissed: true }).catch(() => {});
  }, [userId]);

  return { done, dismissed, dismiss, ready };
}
