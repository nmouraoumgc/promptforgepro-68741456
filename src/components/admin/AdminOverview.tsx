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

interface UserProfile {
  id: string;
  email: string;
  current_plan: string;
  created_at: string;
}

interface Purchase {
  id: string;
  user_id: string;
  plan: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  status: string;
  price_id: string;
  environment: string;
  current_period_end: string | null;
  created_at: string;
}

interface Props {
  users: UserProfile[];
  purchases: Purchase[];
  subscriptions: Subscription[];
}

const fmtEur = (cents: number) =>
  new Intl.NumberFormat(isEnglishNow() ? 'en-GB' : 'pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(isEnglishNow() ? 'en-GB' : 'pt-PT', { month: 'short', year: '2-digit' });
};

export function AdminOverview({ users, purchases, subscriptions }: Props) {
  const isEnglish = useIsEnglish();
  const stats = useMemo(() => {
    const completed = purchases.filter((p) => p.status === 'completed');
    const totalRevenueCents = completed.reduce((s, p) => s + p.amount_cents, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRevenueCents = completed
      .filter((p) => new Date(p.created_at) >= startOfMonth)
      .reduce((s, p) => s + p.amount_cents, 0);

    // Active live Pro subs = MRR @ 9€ (includes trial price)
    const proPriceIds = new Set(['pro_monthly', 'pro_monthly_trial_7d']);
    const activeProSubs = subscriptions.filter(
      (s) =>
        s.environment === 'live' &&
        proPriceIds.has(s.price_id) &&
        ['active', 'trialing', 'past_due'].includes(s.status) &&
        (!s.current_period_end || new Date(s.current_period_end) > now)
    ).length;
    const mrrCents = activeProSubs * 900;

    const trialingSubs = subscriptions.filter(
      (s) => s.environment === 'live' && s.status === 'trialing'
    ).length;
    const pastDueSubs = subscriptions.filter(
      (s) => s.environment === 'live' && s.status === 'past_due'
    ).length;

    const proUsers = users.filter((u) => u.current_plan === 'pro').length;
    const premiumUsers = users.filter((u) => u.current_plan === 'premium').length;
    const freeUsers = users.filter((u) => u.current_plan === 'free').length;
    const paidUsers = proUsers + premiumUsers;
    const conversionRate = users.length > 0 ? (paidUsers / users.length) * 100 : 0;

    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newUsers30d = users.filter((u) => new Date(u.created_at) >= last30).length;
    const newPurchases30d = completed.filter((p) => new Date(p.created_at) >= last30).length;

    const arpu = paidUsers > 0 ? totalRevenueCents / paidUsers : 0;

    return {
      totalRevenueCents,
      monthRevenueCents,
      mrrCents,
      activeProSubs,
      trialingSubs,
      pastDueSubs,
      proUsers,
      premiumUsers,
      freeUsers,
      paidUsers,
      conversionRate,
      newUsers30d,
      newPurchases30d,
      arpu,
      totalCompleted: completed.length,
    };
  }, [users, purchases, subscriptions]);

  // Revenue + signups by month (last 6 months)
  const monthlySeries = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(monthKey(d));
    }

    const revenueByMonth = new Map<string, number>();
    const signupsByMonth = new Map<string, number>();
    months.forEach((m) => {
      revenueByMonth.set(m, 0);
      signupsByMonth.set(m, 0);
    });

    purchases
      .filter((p) => p.status === 'completed')
      .forEach((p) => {
        const k = monthKey(new Date(p.created_at));
        if (revenueByMonth.has(k)) {
          revenueByMonth.set(k, (revenueByMonth.get(k) || 0) + p.amount_cents / 100);
        }
      });

    users.forEach((u) => {
      const k = monthKey(new Date(u.created_at));
      if (signupsByMonth.has(k)) {
        signupsByMonth.set(k, (signupsByMonth.get(k) || 0) + 1);
      }
    });

    return months.map((m) => ({
      month: monthLabel(m),
      revenue: Number((revenueByMonth.get(m) || 0).toFixed(2)),
      signups: signupsByMonth.get(m) || 0,
    }));
  }, [users, purchases]);

  // Plan distribution
  const planData = useMemo(
    () => [
      { name: 'Free', value: stats.freeUsers, color: 'hsl(var(--muted-foreground))' },
      { name: 'Pro', value: stats.proUsers, color: 'hsl(var(--primary))' },
      { name: 'Premium', value: stats.premiumUsers, color: 'hsl(45 93% 58%)' },
    ],
    [stats]
  );

  // Recent purchases
  const recentPurchases = useMemo(
    () =>
      [...purchases]
        .filter((p) => p.status === 'completed')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [purchases]
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Euro}
          label={isEnglish ? 'Total revenue' : 'Receita Total'}
          value={fmtEur(stats.totalRevenueCents)}
          sub={isEnglish ? `${stats.totalCompleted} completed purchases` : `${stats.totalCompleted} compras concluídas`}
          accent="success"
        />
        <KpiCard
          icon={TrendingUp}
          label="MRR (Pro)"
          value={fmtEur(stats.mrrCents)}
          sub={isEnglish ? `${stats.activeProSubs} active subscriptions` : `${stats.activeProSubs} subscrições ativas`}
          accent="primary"
        />
        <KpiCard
          icon={Repeat}
          label={isEnglish ? 'Revenue this month' : 'Receita este mês'}
          value={fmtEur(stats.monthRevenueCents)}
          sub={isEnglish ? `${stats.newPurchases30d} purchases in the last 30d` : `${stats.newPurchases30d} compras nos últimos 30d`}
          accent="info"
        />
        <KpiCard
          icon={Users}
          label={isEnglish ? 'Users' : 'Utilizadores'}
          value={String(users.length)}
          sub={isEnglish ? `+${stats.newUsers30d} in the last 30d` : `+${stats.newUsers30d} nos últimos 30d`}
          accent="amber"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <SmallStat icon={Crown} label="Premium" value={stats.premiumUsers} />
        <SmallStat icon={Sparkles} label="Pro" value={stats.proUsers} />
        <SmallStat
          icon={UserPlus}
          label={isEnglish ? 'Conversion' : 'Conversão'}
          value={`${stats.conversionRate.toFixed(1)}%`}
        />
        <SmallStat icon={ShoppingCart} label="ARPU" value={fmtEur(stats.arpu)} />
        <SmallStat icon={Sparkles} label={isEnglish ? 'On trial' : 'Em trial'} value={stats.trialingSubs} />
        <SmallStat icon={TrendingUp} label="Past Due" value={stats.pastDueSubs} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{isEnglish ? 'Revenue (last 6 months)' : 'Receita (últimos 6 meses)'}</CardTitle>
            <CardDescription>{isEnglish ? 'Sum of completed purchases per month (€)' : 'Soma de compras concluídas por mês (€)'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySeries}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                    formatter={(v: number) => [`${v.toFixed(2)}€`, isEnglish ? 'Revenue' : 'Receita']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isEnglish ? 'New users (last 6 months)' : 'Novos utilizadores (últimos 6 meses)'}</CardTitle>
            <CardDescription>{isEnglish ? 'Sign-ups per month' : 'Registos por mês'}</CardDescription>
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
                  <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{isEnglish ? 'Plan distribution' : 'Distribuição de planos'}</CardTitle>
            <CardDescription>Free vs Pro vs Premium</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                  >
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
            <CardTitle>{isEnglish ? 'Recent purchases' : 'Compras recentes'}</CardTitle>
            <CardDescription>{isEnglish ? 'Last 5 completed transactions' : 'Últimas 5 transações concluídas'}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPurchases.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {isEnglish ? 'No purchases yet.' : 'Ainda sem compras.'}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentPurchases.map((p) => (
                  <li key={p.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        {p.plan === 'premium' ? (
                          <Crown className="h-4 w-4 text-primary" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{p.plan}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString(isEnglish ? 'en-GB' : 'pt-PT', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                          {p.user_id.slice(0, 8)}…
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold">{fmtEur(p.amount_cents)}</span>
                  </li>
                ))}
              </ul>
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
