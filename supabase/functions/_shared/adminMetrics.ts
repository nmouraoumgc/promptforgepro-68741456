// Pure computation of admin revenue metrics from raw Paddle API objects (no Deno/Node deps, unit-testable).
// Amounts are in minor units (cents) per currency. Nothing here ever touches secrets.

export type Money = Record<string, number>; // currency -> cents

export interface AdminMetrics {
  generated_at: string;
  mrr_paid: Money;            // active subs whose latest completed charge was > 0, normalised to monthly
  mrr_paid_subs: number;
  mrr_forecast: Money;        // active subs with a non-zero recurring price and no scheduled cancel/pause
  mrr_forecast_subs: number;
  active_subs: number;        // every active/trialing/past_due sub in Paddle (incl. 0-charge ones)
  zero_charge_active_subs: number; // active subs that have never been charged (e.g. 100% first-month codes)
  revenue_month: Money;       // gross completed transactions billed this calendar month (UTC)
  revenue_month_net: Money;   // minus approved refunds/chargebacks created this month
  paid_txns_month: number;
  free_txns_month: number;
  revenue_30d: Money;
  paid_txns_30d: number;
  revenue_all_time: Money;
  revenue_all_time_net: Money;
  paid_txns_all_time: number;
  refunds_chargebacks_all_time: Money;
  refunds_chargebacks_count: number;
  paying_user_ids: string[];  // supabase user ids (customData.userId) currently paying
  revenue_by_month: { month: string; amounts: Money }[]; // last 6 months, gross
  recent_paid: { id: string; billed_at: string; currency: string; total: number; origin: string; user_id: string | null }[];
}

const add = (m: Money, cur: string, v: number) => { if (v) m[cur] = (m[cur] ?? 0) + v; };
const num = (v: unknown) => Number(v ?? 0) || 0;
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

function monthlyFactor(cycle: { interval?: string; frequency?: number } | null | undefined): number {
  if (!cycle?.interval) return 1;
  const f = cycle.frequency || 1;
  switch (cycle.interval) {
    case 'day': return 30 / f;
    case 'week': return 52 / 12 / f;
    case 'month': return 1 / f;
    case 'year': return 1 / (12 * f);
    default: return 1;
  }
}

// deno-lint-ignore no-explicit-any
type Any = any;

export function computeAdminMetrics(subs: Any[], txns: Any[], adjs: Any[], now = new Date()): AdminMetrics {
  const completed = txns.filter((t) => t.status === 'completed' || t.status === 'paid');
  const txTotal = (t: Any) => num(t?.details?.totals?.grand_total ?? t?.details?.totals?.total);
  const when = (t: Any) => new Date(t.billed_at ?? t.created_at);
  const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const since30 = new Date(now.getTime() - 30 * 86400000);

  // latest completed transaction per subscription
  const lastBySub = new Map<string, Any>();
  for (const t of completed) {
    if (!t.subscription_id) continue;
    const prev = lastBySub.get(t.subscription_id);
    if (!prev || when(t) > when(prev)) lastBySub.set(t.subscription_id, t);
  }

  const m: AdminMetrics = {
    generated_at: now.toISOString(), mrr_paid: {}, mrr_paid_subs: 0, mrr_forecast: {}, mrr_forecast_subs: 0,
    active_subs: 0, zero_charge_active_subs: 0, revenue_month: {}, revenue_month_net: {}, paid_txns_month: 0,
    free_txns_month: 0, revenue_30d: {}, paid_txns_30d: 0, revenue_all_time: {}, revenue_all_time_net: {},
    paid_txns_all_time: 0, refunds_chargebacks_all_time: {}, refunds_chargebacks_count: 0, paying_user_ids: [],
    revenue_by_month: [], recent_paid: [],
  };
  const paying = new Set<string>();

  for (const s of subs) {
    if (!['active', 'trialing', 'past_due'].includes(s.status)) continue;
    m.active_subs++;
    const cur = s.currency_code;
    const rec = s.recurring_transaction_details?.totals;
    let recurring = rec ? num(rec.grand_total ?? rec.total) : 0;
    if (!rec) for (const it of s.items ?? []) recurring += num(it?.price?.unit_price?.amount) * (it.quantity ?? 1);
    if (s.discount && s.discount.type === 'percentage' && num(s.discount.amount) >= 100) recurring = 0;
    const factor = monthlyFactor(s.billing_cycle ?? s.items?.[0]?.price?.billing_cycle);
    const monthly = Math.round(recurring * factor);
    const last = lastBySub.get(s.id);
    const lastCharged = last ? txTotal(last) : 0;
    if (lastCharged <= 0) m.zero_charge_active_subs++;
    if (lastCharged > 0 && monthly > 0) {
      add(m.mrr_paid, cur, monthly); m.mrr_paid_subs++;
      const uid = s.custom_data?.userId; if (uid) paying.add(uid);
    }
    const sched = s.scheduled_change?.action;
    if (monthly > 0 && sched !== 'cancel' && sched !== 'pause') { add(m.mrr_forecast, cur, monthly); m.mrr_forecast_subs++; }
  }

  // refunds / chargebacks (approved) per transaction
  const refundedTx = new Map<string, number>();
  const adjMonth: Money = {};
  for (const a of adjs) {
    if (a.status !== 'approved' || !['refund', 'chargeback', 'chargeback_warning'].includes(a.action)) continue;
    const v = num(a.totals?.total);
    add(m.refunds_chargebacks_all_time, a.currency_code, v); m.refunds_chargebacks_count++;
    refundedTx.set(a.transaction_id, (refundedTx.get(a.transaction_id) ?? 0) + v);
    if (new Date(a.created_at) >= startMonth) add(adjMonth, a.currency_code, v);
  }

  const months: string[] = [];
  for (let i = 5; i >= 0; i--) months.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  const byMonth = new Map<string, Money>(months.map((k) => [k, {}]));

  for (const t of completed) {
    const v = txTotal(t); const cur = t.currency_code; const d = when(t);
    if (d >= startMonth) { if (v > 0) m.paid_txns_month++; else m.free_txns_month++; add(m.revenue_month, cur, v); }
    if (v <= 0) continue;
    m.paid_txns_all_time++; add(m.revenue_all_time, cur, v);
    if (d >= since30) { m.paid_txns_30d++; add(m.revenue_30d, cur, v); }
    const bm = byMonth.get(monthKey(d)); if (bm) add(bm, cur, v);
    // one-time (non-subscription) paid purchase in the last 30 days that was not refunded -> paying user
    const uid = t.custom_data?.userId;
    if (uid && !t.subscription_id && d >= since30 && (refundedTx.get(t.id) ?? 0) < v) paying.add(uid);
    m.recent_paid.push({ id: t.id, billed_at: d.toISOString(), currency: cur, total: v, origin: t.origin, user_id: uid ?? null });
  }
  m.recent_paid.sort((a, b) => b.billed_at.localeCompare(a.billed_at)); m.recent_paid = m.recent_paid.slice(0, 5);

  for (const [cur, v] of Object.entries(m.revenue_month)) m.revenue_month_net[cur] = v;
  for (const [cur, v] of Object.entries(adjMonth)) m.revenue_month_net[cur] = (m.revenue_month_net[cur] ?? 0) - v;
  for (const [cur, v] of Object.entries(m.revenue_all_time)) m.revenue_all_time_net[cur] = v;
  for (const [cur, v] of Object.entries(m.refunds_chargebacks_all_time)) m.revenue_all_time_net[cur] = (m.revenue_all_time_net[cur] ?? 0) - v;

  m.revenue_by_month = months.map((k) => ({ month: k, amounts: byMonth.get(k)! }));
  m.paying_user_ids = [...paying];
  return m;
}
