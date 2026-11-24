// Admin-only, read-only revenue metrics straight from Paddle (live). Caller must have the 'admin' role.
// Only GET requests are made to Paddle; the API key stays server-side and is never returned or logged.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { gatewayFetch } from '../_shared/paddle.ts';
import { computeAdminMetrics, toSignupMonths } from '../_shared/adminMetrics.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

async function getAll(path: string, maxPages = 20): Promise<unknown[]> {
  const out: unknown[] = [];
  let url: string | null = path;
  for (let i = 0; url && i < maxPages; i++) {
    const r = await gatewayFetch('live', url, { method: 'GET' });
    if (!r.ok) throw new Error(`paddle ${r.status} on ${path.split('?')[0]}`);
    const d = await r.json();
    out.push(...(d.data ?? []));
    const p = d.meta?.pagination;
    url = p?.has_more && p?.next ? String(p.next).replace(/^https:\/\/[^/]+/, '') : null;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: 'auth' }, 401);
    const { data: role } = await admin.from('user_roles').select('role').eq('user_id', u.user.id).eq('role', 'admin').maybeSingle();
    if (!role) return json({ error: 'forbidden' }, 403);

    const signups = await admin.rpc('admin_signups_pro_by_month', { p_months: 6, p_tz: 'Europe/Lisbon' }).then(({ data, error }) => {
      if (error) { console.error('signups_by_month failed', error.message); return []; }
      return data as unknown[];
    });

    // Paddle is historical. A Paddle API outage must not blank the whole admin page.
    // Keep returning DB-backed/provider-neutral data and expose provider health explicitly.
    const paddle = await Promise.allSettled([
      getAll('/subscriptions?status=active,trialing,past_due,paused&per_page=200&include=recurring_transaction_details'),
      getAll('/transactions?status=completed,paid&per_page=30'),
      getAll('/adjustments?per_page=50'),
      getAll('/discounts?status=active,archived&per_page=50'),
    ]);
    const paddleOk = paddle.every((r) => r.status === 'fulfilled');
    const value = (i: number) => paddle[i].status === 'fulfilled' ? (paddle[i] as PromiseFulfilledResult<unknown[]>).value : [];
    if (!paddleOk) {
      console.warn('admin-metrics: Paddle historical metrics partially unavailable');
    }

    const metrics = computeAdminMetrics(value(0), value(1), value(2), new Date(), value(3));
    metrics.signups_by_month = toSignupMonths(signups);

    const { data: providerSubs, error: providerSubsError } = await admin
      .from('subscriptions')
      .select('status,paddle_subscription_id,creem_subscription_id,created_at,current_period_end');
    if (providerSubsError) console.error('provider subscription counts failed', providerSubsError.message);
    const rows = providerSubs ?? [];
    const active = (s: string) => ['active','trialing','past_due'].includes(s);
    return json({
      ...metrics,
      provider_health: { paddle: paddleOk ? 'ok' : 'unavailable', creem: 'db' },
      provider_subscriptions: {
        paddle: rows.filter((s) => s.paddle_subscription_id).length,
        creem: rows.filter((s) => s.creem_subscription_id).length,
        paddle_active: rows.filter((s) => s.paddle_subscription_id && active(s.status)).length,
        creem_active: rows.filter((s) => s.creem_subscription_id && active(s.status)).length,
      },
    });
  } catch (e) {
    console.error('admin-metrics failed', e instanceof Error ? e.message : String(e));
    return json({ error: 'metrics_unavailable' }, 502);
  }
});
