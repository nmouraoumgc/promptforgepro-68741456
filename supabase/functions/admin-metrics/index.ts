// Admin-only, read-only revenue metrics straight from Paddle (live). Caller must have the 'admin' role.
// Only GET requests are made to Paddle; the API key stays server-side and is never returned or logged.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { gatewayFetch } from '../_shared/paddle.ts';
import { computeAdminMetrics } from '../_shared/adminMetrics.ts';

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

    const [subs, txns, adjs, discounts] = await Promise.all([
      getAll('/subscriptions?status=active,trialing,past_due,paused&per_page=200&include=recurring_transaction_details'),
      getAll('/transactions?status=completed,paid&per_page=30'),
      getAll('/adjustments?per_page=50'),
      getAll('/discounts?status=active,archived&per_page=50'),
    ]);
    return json(computeAdminMetrics(subs, txns, adjs, new Date(), discounts));
  } catch (e) {
    console.error('admin-metrics failed', e instanceof Error ? e.message : String(e));
    return json({ error: 'metrics_unavailable' }, 502);
  }
});
