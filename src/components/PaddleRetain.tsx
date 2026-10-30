import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';

/**
 * Loads Paddle.js on every page (public marketing pages and signed-in app pages) so Paddle Retain can run,
 * after the page has finished loading so it never competes with the first paint. For signed-in users with a
 * subscription, passes their Paddle customer id to Retain as pwCustomer.
 */
export default function PaddleRetain() {
  const uid = useAuthStore((s) => s.user?.id ?? null);
  const authLoading = useAuthStore((s) => s.isLoading);

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
