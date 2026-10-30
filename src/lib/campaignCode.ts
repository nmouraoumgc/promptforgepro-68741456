// Campaign discount code from links like /pricing?code=WELCOME100.
// Stored in localStorage (30 day expiry) so it survives signup, email confirmation in a new tab and
// login, plus sessionStorage for the current tab. Cleared after a successful checkout.
const KEY = 'pf_checkout_code';
const ATTR_KEY = 'pf_campaign';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_RE = /^[A-Z0-9-]{3,32}$/;

function norm(c: unknown): string {
  const v = typeof c === 'string' ? c.trim().toUpperCase() : '';
  return CODE_RE.test(v) ? v : '';
}

export function saveCampaignCode(code: string | null | undefined) {
  const c = norm(code);
  if (!c) return;
  try { sessionStorage.setItem(KEY, c); } catch { /* ignore */ }
  try { localStorage.setItem(KEY, JSON.stringify({ c, exp: Date.now() + TTL_MS })); } catch { /* ignore */ }
}

export function getCampaignCode(): string {
  try {
    const s = norm(sessionStorage.getItem(KEY));
    if (s) return s;
  } catch { /* ignore */ }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return '';
    const v = JSON.parse(raw);
    if (!v || typeof v.exp !== 'number' || v.exp <= Date.now()) { localStorage.removeItem(KEY); return ''; }
    return norm(v.c);
  } catch { return ''; }
}

/** Campaign attribution ({c, r}) saved by trackCampaignLanding; same storage rules as the code. */
export function saveCampaignAttribution(v: { c: string; r?: string }) {
  const s = JSON.stringify(v);
  try { sessionStorage.setItem(ATTR_KEY, s); } catch { /* ignore */ }
  try { localStorage.setItem(ATTR_KEY, JSON.stringify({ v, exp: Date.now() + TTL_MS })); } catch { /* ignore */ }
}

export function getCampaignAttribution(): { c?: string; r?: string } | null {
  try {
    const s = sessionStorage.getItem(ATTR_KEY);
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    if (!raw) return null;
    const x = JSON.parse(raw);
    if (!x || typeof x.exp !== 'number' || x.exp <= Date.now()) { localStorage.removeItem(ATTR_KEY); return null; }
    return x.v ?? null;
  } catch { return null; }
}

export function clearCampaignCode() {
  for (const k of [KEY, ATTR_KEY]) {
    try { sessionStorage.removeItem(k); } catch { /* ignore */ }
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
}

/** Where to go after login/signup/confirmation: an explicit ?redirect wins; otherwise /pricing when a
 *  campaign code is waiting, else the fallback. Only same-site paths are accepted. */
export function postAuthPath(redirectParam: string | null | undefined, fallback = '/app'): string {
  const r = typeof redirectParam === 'string' && /^\/(?!\/)/.test(redirectParam) ? redirectParam : '';
  if (r && r !== '/' && r !== '/app') return r;
  if (getCampaignCode()) return '/pricing';
  return r || fallback;
}

/** Capture ?code= from any landing URL (called once at startup). */
export function captureCampaignCodeFromUrl() {
  try {
    const code = new URL(window.location.href).searchParams.get('code');
    if (code) saveCampaignCode(code);
  } catch { /* ignore */ }
}
