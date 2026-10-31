import { useMemo } from 'react';
import {
  TrendingUp,
  Euro,
  Users,
  ShoppingCart,
  Crown,
  Sparkles,
  UserPlus,
  Repeat,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useIsEnglish, isEnglishNow } from '@/i18n/lang';

/** Money by currency in minor units (cents), e.g. { EUR: 900, USD: 6300 }. */
export type Money = Record<string, number>;

/** Response of the admin-only `admin-metrics` edge function (computed from live Paddle data). */
export interface AdminMetrics {
  generated_at: string;
  mrr_paid: Money;
  mrr_paid_subs: number;
  mrr_forecast: Money;
  mrr_forecast_subs: number;
  active_subs: number;
  zero_charge_active_subs: number;
  revenue_month: Money;
  revenue_month_net: Money;
  paid_txns_month: number;
  free_txns_month: number;
  revenue_30d: Money;
  paid_txns_30d: number;
  revenue_all_time: Money;
  revenue_all_time_net: Money;
  paid_txns_all_time: number;
  refunds_chargebacks_all_time: Money;
  refunds_chargebacks_count: number;
  paying_user_ids: string[];
  revenue_by_month: { month: string; amounts: Money }[];
  recent_paid: { id: string; billed_at: string; currency: string; total: number; origin: string; user_id: string | null }[];
  completed_txns_all_time: number;
  paid_txns: { id: string; billed_at: string; currency: string; total: number; refunded: number; origin: string; subscription_id: string | null; discount_code: string | null }[];
  discounts: { id: string; code: string | null; description: string | null; type: string; amount: string; currency: string | null; status: string; recur: boolean; times_used: number; usage_limit: number | null; expires_at: string | null; created_at: string }[];
  discounts_active: number;
  discounts_total: number;
  /** Exact signups per month and how many of them are Pro (flag or active/trialing subscription). */
  signups_by_month?: { month: string; signups: number; pro: number }[];
}

/** Exact counts from `count: 'exact'` queries (not limited by the 1000-row API cap). */
export interface UserCounts {
  total: number;
  pro: number;
  premium: number;
  free: number;
  new30d: number;
  signupsByMonth: { month: string; count: number }[];
}

interface Props {
  counts: UserCounts | null;
  metrics: AdminMetrics | null;
  metricsError: string | null;
}

export const fmtCur = (cents: number, currency: string) =>
  new Intl.NumberFormat(isEnglishNow() ? 'en-GB' : 'pt-PT', { style: 'currency', currency }).format(cents / 100);

/** "0,00 €" when empty, otherwise "63,00 US$ + 9,00 €"; each currency shown as-is, never converted. */
export const fmtMoney = (m: Money | undefined, fallbackCurrency = 'EUR') => {
  const entries = Object.entries(m ?? {}).filter(([, v]) => v !== 0);
  if (entries.length === 0) return fmtCur(0, fallbackCurrency);
  return entries.map(([c, v]) => fmtCur(v, c)).join(' + ');
};

const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(isEnglishNow() ? 'en-GB' : 'pt-PT', { month: 'short', year: '2-digit' });
};

export function AdminOverview({ counts, metrics, metricsError }: Props) {
  const isEnglish = useIsEnglish();
  const na = 'n/d';

  const stats = useMemo(() => {
    const total = counts?.total ?? 0;
    const payingUsers = metrics ? metrics.paying_user_ids.length : null;
    const conversionRate = payingUsers !== null && total > 0 ? (payingUsers / total) * 100 : null;
    return { total, payingUsers, conversionRate };
  }, [counts, metrics]);

  const currencies = useMemo(() => {
    const set = new Set<string>();
    metrics?.revenue_by_month.forEach((r) => Object.keys(r.amounts).forEach((c) => set.add(c)));
    if (set.size === 0) set.add('EUR');
    return [...set].sort();
  }, [metrics]);

  const monthlySeries = useMemo(() => {
    const serverSignups = metrics?.signups_by_month?.length ? metrics.signups_by_month : null;
    const months = serverSignups?.map((s) => s.month) ?? counts?.signupsByMonth.map((s) => s.month) ?? metrics?.revenue_by_month.map((r) => r.month) ?? [];
    return months.map((m) => {
      const rev = metrics?.revenue_by_month.find((r) => r.month === m)?.amounts ?? {};
      const srv = serverSignups?.find((s) => s.month === m);
      const row: Record<string, string | number> = {
        month: monthLabel(m),
        signups: srv?.signups ?? counts?.signupsByMonth.find((s) => s.month === m)?.count ?? 0,
      };
      if (srv) row.pro = srv.pro;
      currencies.forEach((c) => { row[c] = Number(((rev[c] ?? 0) / 100).toFixed(2)); });
      return row;
    });
  }, [counts, metrics, currencies]);
  const hasProSeries = !!metrics?.signups_by_month?.length;

  const planData = useMemo(
    () => [
      { name: 'Free', value: counts?.free ?? 0, color: 'hsl(var(--muted-foreground))' },
      { name: 'Pro', value: counts?.pro ?? 0, color: 'hsl(var(--primary))' },
      { name: 'Prompt Packs', value: counts?.premium ?? 0, color: 'hsl(45 93% 58%)' },
    ],
    [counts]
  );

  const curColors = ['hsl(var(--primary))', 'hsl(160 70% 45%)', 'hsl(45 93% 58%)'];

  return (
    <div className="space-y-6">
      {metricsError && (
        <Card className="border-destructive/50">
          <CardContent className="py-3 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> {metricsError}
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={TrendingUp}
          label={isEnglish ? 'Real MRR (paid)' : 'MRR real (pago)'}
          value={metrics ? fmtMoney(metrics.mrr_paid) : na}
          sub={metrics ? (isEnglish
            ? `${metrics.mrr_paid_subs} subscriptions with a real charge`
            : `${metrics.mrr_paid_subs} subscrições com cobrança real`) : undefined}
          accent="success"
        />
        <KpiCard
          icon={Repeat}
          label={isEnglish ? 'Forecast MRR' : 'MRR previsto'}
          value={metrics ? fmtMoney(metrics.mrr_forecast) : na}
          sub={metrics ? (isEnglish
            ? `${metrics.mrr_forecast_subs} active in Paddle · ${metrics.zero_charge_active_subs} never charged (only if next renewal succeeds)`
            : `${metrics.mrr_forecast_subs} ativas no Paddle · ${metrics.zero_charge_active_subs} nunca cobradas (só se a próxima renovação passar)`) : undefined}
          accent="primary"
        />
        <KpiCard
          icon={Euro}
          label={isEnglish ? 'Revenue this month' : 'Receita este mês'}
          value={metrics ? fmtMoney(metrics.revenue_month) : na}
          sub={metrics ? (isEnglish
            ? `${metrics.paid_txns_month} paid · ${metrics.free_txns_month} at 0 · net ${fmtMoney(metrics.revenue_month_net)} (Paddle)`
            : `${metrics.paid_txns_month} pagas · ${metrics.free_txns_month} a 0 · líquido ${fmtMoney(metrics.revenue_month_net)} (Paddle)`) : undefined}
          accent="info"
        />
        <KpiCard
          icon={ShoppingCart}
          label={isEnglish ? 'Total revenue (net)' : 'Receita total (líquida)'}
          value={metrics ? fmtMoney(metrics.revenue_all_time_net) : na}
          sub={metrics ? (isEnglish
            ? `gross ${fmtMoney(metrics.revenue_all_time)} · ${metrics.paid_txns_all_time} paid · ${metrics.refunds_chargebacks_count} refunds/chargebacks`
            : `bruto ${fmtMoney(metrics.revenue_all_time)} · ${metrics.paid_txns_all_time} pagas · ${metrics.refunds_chargebacks_count} reembolsos/chargebacks`) : undefined}
          accent="amber"
        />
        <KpiCard
          icon={Users}
          label={isEnglish ? 'Users' : 'Utilizadores'}
          value={counts ? String(counts.total) : na}
          sub={counts ? (isEnglish ? `+${counts.new30d} in the last 30d` : `+${counts.new30d} nos últimos 30d`) : undefined}
          accent="amber"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <SmallStat icon={Crown} label={isEnglish ? 'Prompt Packs (plan)' : 'Prompt Packs (plano)'} value={counts?.premium ?? na} />
        <SmallStat icon={Sparkles} label={isEnglish ? 'Pro (flag)' : 'Pro (flag)'} value={counts?.pro ?? na} />
        <SmallStat icon={Users} label={isEnglish ? 'Paying users' : 'Pagantes reais'} value={stats.payingUsers ?? na} />
        <SmallStat
          icon={UserPlus}
          label={isEnglish ? 'Conversion (paying)' : 'Conversão (pagantes)'}
          value={stats.conversionRate !== null ? `${stats.conversionRate.toFixed(2)}%` : na}
        />
        <SmallStat icon={Repeat} label={isEnglish ? 'Revenue 30d' : 'Receita 30d'} value={metrics ? fmtMoney(metrics.revenue_30d) : na} />
        <SmallStat
          icon={AlertTriangle}
          label={isEnglish ? 'Refunds/chargebacks' : 'Reembolsos/chargebacks'}
          value={metrics ? fmtMoney(metrics.refunds_chargebacks_all_time) : na}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{isEnglish ? 'Revenue (last 6 months)' : 'Receita (últimos 6 meses)'}</CardTitle>
            <CardDescription>{isEnglish ? 'Completed Paddle transactions with a real charge, per currency' : 'Transações Paddle concluídas com cobrança real, por moeda'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    formatter={(v: number, name: string) => [fmtCur(Math.round(v * 100), name), name]}
                  />
                  <Legend />
                  {currencies.map((c, i) => (
                    <Area
                      key={c}
                      type="monotone"
                      dataKey={c}
                      stroke={curColors[i % curColors.length]}
                      strokeWidth={2}
                      fill={curColors[i % curColors.length]}
                      fillOpacity={0.15}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isEnglish ? 'New users (last 6 months)' : 'Novos utilizadores (últimos 6 meses)'}</CardTitle>
            <CardDescription>
              {isEnglish
                ? 'Sign-ups per month and how many of them became Pro (exact counts)'
                : 'Registos por mês e quantos desses passaram a Pro (contagens exatas)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      color: 'hsl(var(--popover-foreground))',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="signups" name={isEnglish ? 'Sign-ups' : 'Registos'} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  {hasProSeries && (
                    <Bar dataKey="pro" name={isEnglish ? 'Became Pro' : 'Passaram a Pro'} fill="hsl(45 93% 58%)" radius={[6, 6, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{isEnglish ? 'Plan distribution (profile flag)' : 'Distribuição de planos (flag do perfil)'}</CardTitle>
            <CardDescription>
              {isEnglish
                ? 'Plan flag on profiles, not the same as paying (includes 100%-discount and manual grants)'
                : 'Flag de plano nos perfis, não é o mesmo que pagar (inclui descontos de 100% e atribuições manuais)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2}>
                    {planData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      color: 'hsl(var(--popover-foreground))',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isEnglish ? 'Recent paid transactions' : 'Transações pagas recentes'}</CardTitle>
            <CardDescription>{isEnglish ? 'Last 5 completed Paddle transactions with amount > 0' : 'Últimas 5 transações Paddle concluídas com valor > 0'}</CardDescription>
          </CardHeader>
          <CardContent>
            {!metrics || metrics.recent_paid.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {isEnglish ? 'No paid transactions yet.' : 'Ainda sem transações pagas.'}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {metrics.recent_paid.map((p) => (
                  <li key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{p.origin === 'subscription_recurring' ? (isEnglish ? 'renewal' : 'renovação') : (isEnglish ? 'new' : 'nova')}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.billed_at).toLocaleDateString(isEnglish ? 'en-GB' : 'pt-PT', {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">{p.id.slice(0, 14)}…</p>
                    </div>
                    <span className="font-semibold">{fmtCur(p.total, p.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
            {metrics && (
              <p className="text-[0.6875rem] text-muted-foreground mt-3">
                {isEnglish ? 'Source: Paddle (live), updated' : 'Fonte: Paddle (live), atualizado'}{' '}
                {new Date(metrics.generated_at).toLocaleString(isEnglish ? 'en-GB' : 'pt-PT', { timeZone: 'Europe/Lisbon' })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent: 'primary' | 'success' | 'info' | 'amber';
}) {
  const accentMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
    amber: 'bg-amber-500/10 text-amber-600',
  } as const;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1 truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SmallStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
