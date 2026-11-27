// Admin-only, read-only revenue metrics straight from Paddle (live). Caller must have the 'admin' role.
// Only GET requests are made to Paddle; the API key stays server-side and is never returned or logged.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { gatewayFetch } from '../_shared/paddle.ts';
import { creemEnvironment, creemRequest } from '../_shared/creem.ts';
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

async function creemFinancials(now: Date) {
  if (creemEnvironment() !== 'live') return null;
  const totals: Record<string, number> = {};
  const month: Record<string, number> = {};
  const last30: Record<string, number> = {};
  let paid = 0;
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const start30 = now.getTime() - 30 * 86400000;
  for (let page = 1; page <= 100; page++) {
    const response = await creemRequest(`transactions/search?page_number=${page}&page_size=100`);
    const transactions = response.items ?? response.data ?? response.transactions;
    if (!Array.isArray(transactions) || !response.pagination || typeof response.pagination.total_pages !== 'number') {
      throw new Error('Unexpected Creem transaction response');
    }
    for (const transaction of transactions) {
      if (!['paid', 'refunded', 'partially_refunded', 'chargeback'].includes(transaction.status) ||
          !['payment', 'invoice'].includes(transaction.type)) continue;
      if (!Number.isSafeInteger(transaction.amount_paid) || transaction.amount_paid < 0 ||
          !/^[A-Z]{3}$/.test(transaction.currency)) throw new Error('Invalid Creem transaction amount');
      const date = typeof transaction.created_at === 'number'
        ? transaction.created_at : new Date(transaction.created_at).getTime();
      if (!Number.isFinite(date)) throw new Error('Invalid Creem transaction date');
      const add = (bucket: Record<string, number>) => {
        bucket[transaction.currency] = (bucket[transaction.currency] ?? 0) + transaction.amount_paid;
      };
      paid++;
      add(totals);
      if (date >= startMonth) add(month);
      if (date >= start30) add(last30);
    }
    if (page >= response.pagination.total_pages) return { paid_transactions: paid, gross_all_time: totals, gross_month: month, gross_30d: last30 };
  }
  throw new Error('Creem transaction history exceeds page limit');
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
    const creemFinancial = await creemFinancials(new Date()).catch((error) => {
      console.warn('Creem financial metrics unavailable', error instanceof Error ? error.message : 'unknown');
      return null;
    });
    metrics.signups_by_month = toSignupMonths(signups);

    const { data: providerSubs, error: providerSubsError } = await admin
      .from('subscriptions')
      .select('status,paddle_subscription_id,creem_subscription_id,current_period_end');
    if (providerSubsError) console.error('provider subscription counts failed', providerSubsError.message);
    const rows = providerSubs ?? [];
    // Completed Creem Packs purchases are the only Creem financial amounts stored
    // locally. Subscription payments, refunds and net settlement need provider data.
    const creemPurchases: { user_id: string; amount_cents: number; currency: string }[] = [];
    let creemPurchasesError: unknown = null;
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.from('purchases')
        .select('user_id,amount_cents,currency')
        .eq('status', 'completed').not('creem_order_id', 'is', null)
        .order('id').range(offset, offset + 999);
      if (error) { creemPurchasesError = error; break; }
      creemPurchases.push(...(data ?? []));
      if ((data ?? []).length < 1000) break;
    }
    if (creemPurchasesError) console.error('Creem purchase totals failed');
    const creemGross: Record<string, number> = {};
    for (const purchase of creemPurchases) {
      const currency = purchase.currency || 'EUR';
      creemGross[currency] = (creemGross[currency] ?? 0) + purchase.amount_cents;
    }
    const active = (s: {status: string; current_period_end: string | null}) =>
      ['active','trialing','past_due'].includes(s.status) &&
      (!s.current_period_end || new Date(s.current_period_end).getTime() > Date.now());
    return json({
      ...metrics,
      provider_health: { paddle: paddleOk ? 'ok' : 'unavailable', creem: providerSubsError ? 'unavailable' : 'db' },
      creem_financial: creemFinancial,
      creem_packs: creemPurchasesError ? null : {
        paid_orders: creemPurchases.length,
        buyers: new Set(creemPurchases.map(p => p.user_id)).size,
        recorded_gross: creemGross,
      },
      // Creem confirmed payments are not included in Paddle's historical transaction feed.
      financial_data_complete: false,
      paddle_data_complete: paddleOk,
      provider_subscriptions: providerSubsError ? null : {
        paddle: rows.filter((s) => s.paddle_subscription_id).length,
        creem: rows.filter((s) => s.creem_subscription_id).length,
        paddle_active: rows.filter((s) => s.paddle_subscription_id && active(s)).length,
        creem_active: rows.filter((s) => s.creem_subscription_id && active(s)).length,
      },
    });
  } catch (e) {
    console.error('admin-metrics failed', e instanceof Error ? e.message : String(e));
    return json({ error: 'metrics_unavailable' }, 502);
  }
});
