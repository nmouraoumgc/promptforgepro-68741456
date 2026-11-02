// Dashboard "first steps" checklist. Progress + dismissal live in user_onboarding (RLS: own row)
// for signed-in users, mirrored in localStorage so visitors and offline use still work.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export type OnboardingStep = 'learn' | 'create' | 'optimize' | 'compare' | 'favorite';
export const ONBOARDING_STEPS: OnboardingStep[] = ['learn', 'create', 'optimize', 'compare', 'favorite'];
const DONE_KEY = 'onboarding-completed';
const DISMISS_KEY = 'onboarding-dismissed';
const EVT = 'pf-onboarding-change';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const uniq = (a: string[]) => Array.from(new Set(a)).filter((s) => (ONBOARDING_STEPS as string[]).includes(s)) as OnboardingStep[];
const readLocalDone = (): OnboardingStep[] => { try { return uniq(JSON.parse(localStorage.getItem(DONE_KEY) || '[]')); } catch { return []; } };
const readLocalDismissed = () => localStorage.getItem(DISMISS_KEY) === 'true';

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
  const cur = readLocalDone();
  if (!cur.includes(step)) localStorage.setItem(DONE_KEY, JSON.stringify([...cur, step]));
  window.dispatchEvent(new Event(EVT));
  saveRemote({ completed_steps: [step] }).catch(() => { /* offline: localStorage keeps it */ });
}

export function useOnboarding(derived: OnboardingStep[]) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [done, setDone] = useState<OnboardingStep[]>(readLocalDone);
  const [dismissed, setDismissed] = useState<boolean>(readLocalDismissed);
  const [ready, setReady] = useState(!userId);
  const derivedKey = derived.join(',');

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const local = readLocalDone();
      let remoteDone: string[] = [];
      let remoteDismissed = false;
      if (userId) {
        const { data } = await db.from('user_onboarding').select('completed_steps, dismissed').eq('user_id', userId).maybeSingle();
        remoteDone = data?.completed_steps || [];
        remoteDismissed = !!data?.dismissed;
      }
      const merged = uniq([...local, ...remoteDone, ...derived]);
      const isDismissed = userId ? remoteDismissed : readLocalDismissed();
      if (cancelled) return;
      localStorage.setItem(DONE_KEY, JSON.stringify(merged));
      setDone(merged);
      setDismissed(isDismissed);
      setReady(true);
      if (userId && merged.some((s) => !remoteDone.includes(s))) saveRemote({ completed_steps: merged }).catch(() => {});
    };
    sync().catch(() => setReady(true));
    const onChange = () => setDone(readLocalDone());
    window.addEventListener(EVT, onChange);
    return () => { cancelled = true; window.removeEventListener(EVT, onChange); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, derivedKey]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
    saveRemote({ dismissed: true }).catch(() => {});
  }, []);

  return { done, dismissed, dismiss, ready };
}
