import { supabase } from '@/integrations/supabase/client';
import { saveCampaignAttribution, getCampaignAttribution } from '@/lib/campaignCode';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Logs a campaign landing once per tab for links like /pricing?code=X&c=A1&r=<send id> (email batches) or
 *  /pricing?code=X&c=ONEHACK (public channels, no r), then removes c/r from the URL. */
export function trackCampaignLanding() {
  try {
    const url = new URL(window.location.href);
    const c = (url.searchParams.get('c') || '').trim();
    const r = (url.searchParams.get('r') || '').trim();
    if (!c) { trackReferrer(url.pathname); return; }
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(c)) return;
    if (!r) {
      // Public channel link (e.g. ?code=ONEHACK100&c=ONEHACK): one visit per tab session; the server ignores unknown channels.
      url.searchParams.delete('c');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
      const ck = `pf_visit_${c.toUpperCase()}`;
      saveCampaignAttribution({ c: c.toUpperCase(), s: 'link' });
      if (sessionStorage.getItem(ck)) return;
      sessionStorage.setItem(ck, '1');
      supabase.rpc('log_campaign_visit' as never, { p_channel: c, p_path: url.pathname } as never).then(() => {}, () => {});
      return;
    }
    if (!UUID.test(r)) return;
    url.searchParams.delete('c'); url.searchParams.delete('r');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    const key = `pf_landed_${r}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    saveCampaignAttribution({ c, r, s: 'link' });
    // PostgREST builders are lazy: .then() is what actually sends the request.
    supabase.rpc('log_campaign_landing' as never, { p_campaign: c, p_send: r, p_path: url.pathname } as never).then(() => {}, () => {});
  } catch { /* never block the app */ }
}

/** Public channels linked without ?c= (e.g. the OneHack post links to plain https://promptforgepro.me):
 *  external document.referrer host (Discourse sends the origin) is mapped to a channel server-side via
 *  campaign_channels.referrer_hosts. One call per referrer host per tab; first touch is kept. */
function trackReferrer(path: string) {
  let host = '';
  try { host = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ''; } catch { return; }
  if (!host || host === window.location.hostname || host.endsWith('promptforgepro.me') || host === 'localhost') return;
  if (!/^[a-z0-9.-]{1,255}$/.test(host)) return;
  const key = `pf_ref_${host}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  supabase.rpc('log_referrer_visit' as never, { p_host: host, p_path: path } as never).then(({ data }) => {
    const ch = typeof data === 'string' ? data : '';
    if (ch && !getCampaignAttribution()?.c) saveCampaignAttribution({ c: ch, s: 'referrer' });
  }, () => {});
}

/** First-touch channel on the signed-in user's profile (server keeps the first value; never overwrites). */
export function syncSignupChannel() {
  try {
    const a = getCampaignAttribution();
    if (!a?.c) return;
    const k = `pf_chan_synced_${a.c}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, '1');
    supabase.rpc('set_signup_channel' as never, { p_channel: a.c, p_source: a.s === 'referrer' ? 'referrer' : 'link' } as never).then(() => {}, () => {});
  } catch { /* ignore */ }
}
