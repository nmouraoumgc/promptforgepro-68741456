// ProfitWell Engagement (Paddle Retain) snippet, loaded as an external module so the CSP needs no inline hash.
// Equivalent to the dashboard's loader: queue stub on window.profitwell, then an async
// <script id="profitwell-js" data-pw-auth="..."> pointing at profitwell.js?auth=<data-pw-auth>.
const PW_AUTH = '7edb8c7c7c1de8e8b1a18606e917fb6d';
const PW_SRC = 'https://public.profitwell.com/js/profitwell.js';

type PwFn = ((...args: unknown[]) => void) & { q?: unknown[] };

function ensureLoaded(): PwFn {
  const w = window as unknown as { profitwell?: PwFn };
  if (!w.profitwell) {
    const stub: PwFn = function (...args: unknown[]) {
      // Keep the snippet's queue shape (arguments objects) so profitwell.js replays them.
      // eslint-disable-next-line prefer-rest-params
      (stub.q = stub.q || []).push(arguments);
      void args;
    } as PwFn;
    w.profitwell = stub;
  }
  if (!document.getElementById('profitwell-js')) {
    const s = document.createElement('script');
    s.id = 'profitwell-js';
    s.setAttribute('data-pw-auth', PW_AUTH);
    s.async = true;
    s.src = `${PW_SRC}?auth=${PW_AUTH}`;
    const first = document.getElementsByTagName('script')[0];
    if (first?.parentNode) first.parentNode.insertBefore(s, first);
    else document.head.appendChild(s);
  }
  return w.profitwell!;
}

let lastIdentity: string | undefined;

/** Start ProfitWell Engagement for the current visitor: { user_email } when signed in, {} otherwise. Re-calls only when identity changes. */
export function profitwellStart(email: string | null) {
  const identity = email ? email.trim().toLowerCase() : '';
  if (identity === lastIdentity) return;
  lastIdentity = identity;
  try {
    ensureLoaded()('start', identity ? { user_email: email!.trim() } : {});
  } catch {
    /* engagement tracking is best effort */
  }
}
