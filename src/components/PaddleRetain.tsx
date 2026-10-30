import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { profitwellStart } from '@/lib/profitwell';

/**
 * Paddle.js is a static tag in index.html and is initialized from main.tsx; the effect below is only a fallback
 * (initializePaddle is a no-op once initialized). For signed-in users with a subscription, passes their Paddle
 * customer id to Retain as pwCustomer (via Paddle.Update).
 */
export default function PaddleRetain() {
  const uid = useAuthStore((s) => s.user?.id ?? null);
  const authLoading = useAuthStore((s) => s.isLoading);
  const email = useAuthStore((s) => s.user?.email ?? null);
  const [pageLoaded, setPageLoaded] = useState(() => typeof document !== 'undefined' && document.readyState === 'complete');

  useEffect(() => {
    if (pageLoaded) return;
    const on = () => setPageLoaded(true);
    window.addEventListener('load', on, { once: true });
    return () => window.removeEventListener('load', on);
  }, [pageLoaded]);

  // ProfitWell Engagement: start once identity is known (after page load so it never competes with first paint);
  // signed-in users by email, visitors with {}. Re-runs on login/logout.
  useEffect(() => {
    if (authLoading || !pageLoaded) return;
    profitwellStart(email);
  }, [email, authLoading, pageLoaded]);

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      import('@/lib/paddle').then(({ initializePaddle }) => initializePaddle()).catch(() => { /* best effort */ });
    };
    const idle = () => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(start, { timeout: 4000 }) : setTimeout(start, 1500));
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle, { once: true });
    return () => { cancelled = true; window.removeEventListener('load', idle); };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      const { setRetainCustomer, getPaddleEnvironment } = await import('@/lib/paddle');
      if (!uid) { setRetainCustomer(null); return; }
      const { data } = await supabase
        .from('subscriptions')
        .select('paddle_customer_id')
        .eq('user_id', uid)
        .eq('environment', getPaddleEnvironment())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setRetainCustomer(data?.paddle_customer_id ?? null);
    })().catch(() => { /* best effort */ });
    return () => { cancelled = true; };
  }, [uid, authLoading]);

  return null;
}
