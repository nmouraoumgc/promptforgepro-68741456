import { supabase } from '@/integrations/supabase/client';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Logs a campaign landing once per tab for links like /pricing?code=X&c=A1&r=<send id>, then removes c/r from the URL. */
export function trackCampaignLanding() {
  try {
    const url = new URL(window.location.href);
    const c = (url.searchParams.get('c') || '').trim();
    const r = (url.searchParams.get('r') || '').trim();
    if (!c || !UUID.test(r) || !/^[A-Za-z0-9_-]{1,40}$/.test(c)) return;
    url.searchParams.delete('c'); url.searchParams.delete('r');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    const key = `pf_landed_${r}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    sessionStorage.setItem('pf_campaign', JSON.stringify({ c, r }));
    // PostgREST builders are lazy: .then() is what actually sends the request.
    supabase.rpc('log_campaign_landing' as never, { p_campaign: c, p_send: r, p_path: url.pathname } as never).then(() => {}, () => {});
  } catch { /* never block the app */ }
}
