import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Users, CreditCard, Plus, Edit, Trash2, 
  ToggleLeft, ToggleRight, Search, Ticket, Copy,
  CheckCircle, XCircle, LayoutDashboard
} from 'lucide-react';
import { AdminFraudFlags } from '@/components/admin/AdminFraudFlags';
import { AdminOverview, fmtCur, fmtMoney, type AdminMetrics, type UserCounts } from '@/components/admin/AdminOverview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { usePromoStore } from '@/stores/promoStore';
import { PromoCodeDialog } from '@/components/promo/PromoCodeDialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from '@/lib/sonner-toast';
import { useIsEnglish } from '@/i18n/lang';

interface PromptPack {
  id: string;
  name: string;
  description: string;
  slug: string;
  is_premium: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

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

export default function Admin() {
  const navigate = useNavigate();
  const isEnglish = useIsEnglish();
  const { toast: showToast } = useToast();
  const { isAdmin, isLoading: authLoading } = useAuthStore();
  const { promoCodes, fetchPromoCodes, deletePromoCode } = usePromoStore();
  
  const [packs, setPacks] = useState<PromptPack[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [userCounts, setUserCounts] = useState<UserCounts | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Promo Dialog state
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  
  // Pack Dialog state
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<PromptPack | null>(null);
  const [packForm, setPackForm] = useState({
    name: '',
    description: '',
    slug: '',
    is_premium: true,
    is_active: true,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/app');
      showToast({
        title: (isEnglish ? 'Access denied' : 'Acesso negado'),
        description: (isEnglish ? "You don't have administrator permissions." : 'Não tens permissões de administrador.'),
        variant: 'destructive',
      });
    }
  }, [isAdmin, authLoading, navigate, showToast]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchUserCounts = async () => {
    const baseCount = () => supabase.from('profiles').select('id', { count: 'exact', head: true });
    type CountQuery = ReturnType<typeof baseCount>;
    const countWhere = async (apply?: (q: CountQuery) => CountQuery) => {
      const q = baseCount();
      const { count } = await (apply ? apply(q) : q);
      return count ?? 0;
    };
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const monthStarts: Date[] = [];
    for (let i = 5; i >= 0; i--) monthStarts.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    const [total, pro, premium, free, new30d, ...perMonth] = await Promise.all([
      countWhere(),
      countWhere((q) => q.eq('current_plan', 'pro')),
      countWhere((q) => q.in('current_plan', ['packs', 'premium'])), // Prompt Packs buyers (+ grandfathered premium)
      countWhere((q) => q.eq('current_plan', 'free')),
      countWhere((q) => q.gte('created_at', last30)),
      ...monthStarts.map((start, i) => {
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        return countWhere((q) => q.gte('created_at', start.toISOString()).lt('created_at', end.toISOString()));
      }),
    ]);
    setUserCounts({
      total, pro, premium, free, new30d,
      signupsByMonth: monthStarts.map((d, i) => ({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        count: perMonth[i],
      })),
    });
  };

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch packs
    const { data: packsData } = await supabase
      .from('prompt_packs')
      .select('*')
      .order('sort_order');
    
    if (packsData) setPacks(packsData);

    // Fetch users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (usersData) setUsers(usersData);

    // Fetch purchases
    const { data: purchasesData } = await supabase
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (purchasesData) setPurchases(purchasesData);

    // Fetch subscriptions (admins can see all)
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('id, user_id, status, price_id, environment, current_period_end, created_at')
      .order('created_at', { ascending: false });

    if (subsData) setSubscriptions(subsData as Subscription[]);

    // Exact user counts (the profiles list above is capped at 1000 rows by PostgREST)
    await fetchUserCounts();

    // Real revenue / MRR from Paddle, computed server-side (admin-only edge function)
    setMetricsError(null);
    const { data: m, error: mErr } = await supabase.functions.invoke('admin-metrics');
    if (mErr || !m || (m as { error?: string }).error) {
      setMetrics(null);
      setMetricsError(isEnglish ? 'Could not load Paddle metrics' : 'Não foi possível carregar as métricas do Paddle');
    } else {
      setMetrics(m as AdminMetrics);
    }

    // Fetch promo codes
    await fetchPromoCodes();

    setIsLoading(false);
  };

  // Promo Code Handlers
  const handleDeletePromo = async (id: string) => {
    if (!confirm((isEnglish ? 'Are you sure you want to delete this code?' : 'Tens a certeza que queres eliminar este código?'))) return;
    
    await deletePromoCode(id);
    toast.success((isEnglish ? 'Promo code deleted' : 'Código de promoção eliminado'));
  };

  const handleCopyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success((isEnglish ? 'Code copied!' : 'Código copiado!'));
  };

  // Pack handlers (existing)
  const handleSavePack = async () => {
    if (editingPack) {
      const { error } = await supabase
        .from('prompt_packs')
        .update(packForm)
        .eq('id', editingPack.id);
      
      if (error) {
        showToast({ title: (isEnglish ? 'Update failed' : 'Erro ao atualizar'), variant: 'destructive' });
      } else {
        showToast({ title: (isEnglish ? 'Pack updated' : 'Pack atualizado') });
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('prompt_packs')
        .insert([{ ...packForm, sort_order: packs.length }]);
      
      if (error) {
        showToast({ title: (isEnglish ? 'Creation failed' : 'Erro ao criar'), description: error.message, variant: 'destructive' });
      } else {
        showToast({ title: (isEnglish ? 'Pack created' : 'Pack criado') });
        fetchData();
      }
    }
    
    setPackDialogOpen(false);
    resetPackForm();
  };

  const handleToggleActive = async (pack: PromptPack) => {
    const { error } = await supabase
      .from('prompt_packs')
      .update({ is_active: !pack.is_active })
      .eq('id', pack.id);
    
    if (!error) {
      fetchData();
    }
  };

  const handleDeletePack = async (id: string) => {
    const { error } = await supabase
      .from('prompt_packs')
      .delete()
      .eq('id', id);
    
    if (!error) {
      showToast({ title: (isEnglish ? 'Pack deleted' : 'Pack eliminado') });
      fetchData();
    }
  };

  const resetPackForm = () => {
    setEditingPack(null);
    setPackForm({
      name: '',
      description: '',
      slug: '',
      is_premium: true,
      is_active: true,
    });
  };

  const openEditPack = (pack: PromptPack) => {
    setEditingPack(pack);
    setPackForm({
      name: pack.name,
      description: pack.description || '',
      slug: pack.slug,
      is_premium: pack.is_premium,
      is_active: pack.is_active,
    });
    setPackDialogOpen(true);
  };

  if (authLoading || !isAdmin) {
    return null;
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 lg:p-10 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Backoffice</h1>
          <p className="text-muted-foreground">{isEnglish ? 'Content, user and promotion management' : 'Gestão de conteúdos, utilizadores e promoções'}</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{packs.length}</p>
                  <p className="text-sm text-muted-foreground">Prompt Packs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userCounts?.total ?? users.length}</p>
                  <p className="text-sm text-muted-foreground">{isEnglish ? 'Users' : 'Utilizadores'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics ? metrics.paid_txns_all_time : 'n/d'}</p>
                  <p className="text-sm text-muted-foreground">{isEnglish ? 'Purchases (paid, Paddle)' : 'Compras (pagas, Paddle)'}</p>
                  {metrics && (
                    <p className="text-xs text-muted-foreground">
                      {isEnglish ? 'gross' : 'bruto'} {fmtMoney(metrics.revenue_all_time)} · {isEnglish ? 'net' : 'líquido'} {fmtMoney(metrics.revenue_all_time_net)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber/10 flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics ? `${metrics.discounts_active}/${metrics.discounts_total}` : 'n/d'}</p>
                  <p className="text-sm text-muted-foreground">{isEnglish ? 'Promo codes (active/total, Paddle)' : 'Códigos Promo (ativos/total, Paddle)'}</p>
                  {metrics && metrics.discounts.filter((d) => d.status === 'active' && (!d.expires_at || new Date(d.expires_at) > new Date())).slice(0, 2).map((d) => (
                    <p key={d.id} className="text-xs text-muted-foreground">
                      {d.code ?? d.id}: {d.times_used}{d.usage_limit ? `/${d.usage_limit}` : ''} {isEnglish ? 'uses' : 'usos'}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="packs">Prompt Packs</TabsTrigger>
            <TabsTrigger value="users">{isEnglish ? 'Users' : 'Utilizadores'}</TabsTrigger>
            <TabsTrigger value="purchases">{isEnglish ? 'Purchases' : 'Compras'}</TabsTrigger>
            <TabsTrigger value="promo">{isEnglish ? 'Promo codes' : 'Códigos de Promoção'}</TabsTrigger>
            <TabsTrigger value="alerts">{isEnglish ? 'Alerts' : 'Alertas'}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">{isEnglish ? 'Loading statistics…' : 'A carregar estatísticas…'}</div>
            ) : (
              <AdminOverview counts={userCounts} metrics={metrics} metricsError={metricsError} />
            )}
          </TabsContent>

          {/* Packs Tab */}
          <TabsContent value="packs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Prompt Packs</CardTitle>
                  <CardDescription>{isEnglish ? 'Manage the available packs' : 'Gere os packs disponíveis'}</CardDescription>
                </div>
                <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetPackForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      {isEnglish ? 'New pack' : 'Novo Pack'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingPack ? (isEnglish ? 'Edit pack' : 'Editar Pack') : (isEnglish ? 'New pack' : 'Novo Pack')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>{isEnglish ? 'Name' : 'Nome'}</Label>
                        <Input
                          value={packForm.name}
                          onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
                          placeholder="TikTok Viral Pack"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug (URL)</Label>
                        <Input
                          value={packForm.slug}
                          onChange={(e) => setPackForm({ ...packForm, slug: e.target.value })}
                          placeholder="tiktok-viral"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{isEnglish ? 'Description' : 'Descrição'}</Label>
                        <Textarea
                          value={packForm.description}
                          onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
                          placeholder={(isEnglish ? 'Pack description...' : 'Descrição do pack...')}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Premium</Label>
                        <Switch
                          checked={packForm.is_premium}
                          onCheckedChange={(v) => setPackForm({ ...packForm, is_premium: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>{isEnglish ? 'Active' : 'Ativo'}</Label>
                        <Switch
                          checked={packForm.is_active}
                          onCheckedChange={(v) => setPackForm({ ...packForm, is_active: v })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setPackDialogOpen(false)}>
                        {isEnglish ? 'Cancel' : 'Cancelar'}
                      </Button>
                      <Button onClick={handleSavePack}>
                        {editingPack ? (isEnglish ? 'Save' : 'Guardar') : (isEnglish ? 'Create' : 'Criar')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isEnglish ? 'Name' : 'Nome'}</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>{isEnglish ? 'Type' : 'Tipo'}</TableHead>
                      <TableHead>{isEnglish ? 'Status' : 'Estado'}</TableHead>
                      <TableHead className="text-right">{isEnglish ? 'Actions' : 'Ações'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packs.map((pack) => (
                      <TableRow key={pack.id}>
                        <TableCell className="font-medium">{pack.name}</TableCell>
                        <TableCell className="text-muted-foreground">{pack.slug}</TableCell>
                        <TableCell>
                          <Badge variant={pack.is_premium ? 'default' : 'secondary'}>
                            {pack.is_premium ? 'Premium' : 'Free'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={pack.is_active ? 'default' : 'outline'}>
                            {pack.is_active ? (isEnglish ? 'Active' : 'Ativo') : (isEnglish ? 'Inactive' : 'Inativo')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(pack)}
                              aria-label={pack.is_active ? (isEnglish ? 'Deactivate pack' : 'Desativar pack') : (isEnglish ? 'Activate pack' : 'Ativar pack')}
                            >
                              {pack.is_active ? (
                                <ToggleRight className="h-4 w-4" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditPack(pack)}
                              aria-label={isEnglish ? 'Edit pack' : 'Editar pack'}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePack(pack.id)}
                              aria-label={isEnglish ? 'Delete pack' : 'Apagar pack'}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{isEnglish ? 'Users' : 'Utilizadores'}</CardTitle>
                    <CardDescription>{isEnglish ? 'Registered users' : 'Lista de utilizadores registados'}</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={(isEnglish ? 'Search by email...' : 'Pesquisar por email...')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>{isEnglish ? 'Plan' : 'Plano'}</TableHead>
                      <TableHead>{isEnglish ? 'Signed up' : 'Registado em'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={
                            user.current_plan === 'premium' || user.current_plan === 'packs' ? 'default' :
                            user.current_plan === 'pro' ? 'secondary' : 'outline'
                          }>
                            {user.current_plan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString(isEnglish ? 'en-GB' : 'pt-PT')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchases Tab */}
          <TabsContent value="purchases">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{isEnglish ? 'Paid transactions (Paddle, read-only)' : 'Transações pagas (Paddle, só leitura)'}</CardTitle>
                <CardDescription>
                  {metrics
                    ? (isEnglish
                      ? `${metrics.paid_txns_all_time} paid of ${metrics.completed_txns_all_time} completed · gross ${fmtMoney(metrics.revenue_all_time)} · refunds/chargebacks ${fmtMoney(metrics.refunds_chargebacks_all_time)}`
                      : `${metrics.paid_txns_all_time} pagas de ${metrics.completed_txns_all_time} concluídas · bruto ${fmtMoney(metrics.revenue_all_time)} · reembolsos/chargebacks ${fmtMoney(metrics.refunds_chargebacks_all_time)}`)
                    : (metricsError ?? (isEnglish ? 'Loading…' : 'A carregar…'))}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics && metrics.paid_txns.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>{isEnglish ? 'Type' : 'Tipo'}</TableHead>
                        <TableHead>{isEnglish ? 'Amount' : 'Valor'}</TableHead>
                        <TableHead>{isEnglish ? 'Refunded' : 'Devolvido'}</TableHead>
                        <TableHead>{isEnglish ? 'Discount' : 'Desconto'}</TableHead>
                        <TableHead>{isEnglish ? 'Date' : 'Data'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.paid_txns.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-sm">{t.id.slice(0, 14)}...</TableCell>
                          <TableCell>
                            <Badge variant="outline">{t.origin === 'subscription_recurring' ? (isEnglish ? 'renewal' : 'renovação') : (isEnglish ? 'new' : 'nova')}</Badge>
                          </TableCell>
                          <TableCell>{fmtCur(t.total, t.currency)}</TableCell>
                          <TableCell>
                            {t.refunded > 0 ? <Badge variant="destructive">{fmtCur(t.refunded, t.currency)}</Badge> : <span className="text-muted-foreground">0</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{t.discount_code ?? '-'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(t.billed_at).toLocaleDateString(isEnglish ? 'en-GB' : 'pt-PT')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{isEnglish ? 'Purchases (database table)' : 'Compras (tabela da base de dados)'}</CardTitle>
                <CardDescription>{isEnglish ? 'Legacy purchases table, not used by Paddle checkout' : 'Tabela antiga de compras, não é usada pelo checkout Paddle'}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>{isEnglish ? 'Plan' : 'Plano'}</TableHead>
                      <TableHead>{isEnglish ? 'Amount' : 'Valor'}</TableHead>
                      <TableHead>{isEnglish ? 'Status' : 'Estado'}</TableHead>
                      <TableHead>{isEnglish ? 'Date' : 'Data'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-mono text-sm">
                          {purchase.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge>{purchase.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          {(purchase.amount_cents / 100).toFixed(2)}€
                        </TableCell>
                        <TableCell>
                          <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                            {purchase.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(purchase.created_at).toLocaleDateString(isEnglish ? 'en-GB' : 'pt-PT')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promo Codes Tab - NEW */}
          <TabsContent value="promo">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{isEnglish ? 'Paddle discounts (read-only)' : 'Descontos Paddle (só leitura)'}</CardTitle>
                <CardDescription>
                  {metrics
                    ? (isEnglish ? `${metrics.discounts_active} active of ${metrics.discounts_total}` : `${metrics.discounts_active} ativos de ${metrics.discounts_total}`)
                    : (metricsError ?? (isEnglish ? 'Loading…' : 'A carregar…'))}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics && metrics.discounts.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isEnglish ? 'Code' : 'Código'}</TableHead>
                        <TableHead>{isEnglish ? 'Discount' : 'Desconto'}</TableHead>
                        <TableHead>{isEnglish ? 'Uses' : 'Usos'}</TableHead>
                        <TableHead>{isEnglish ? 'Status' : 'Estado'}</TableHead>
                        <TableHead>{isEnglish ? 'Expires' : 'Expira'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.discounts.map((d) => {
                        const expired = !!d.expires_at && new Date(d.expires_at) <= new Date();
                        const state = d.status !== 'active' ? (isEnglish ? 'archived' : 'arquivado') : expired ? (isEnglish ? 'expired' : 'expirado') : (isEnglish ? 'active' : 'ativo');
                        return (
                          <TableRow key={d.id}>
                            <TableCell className="font-mono text-sm">{d.code ?? d.id}</TableCell>
                            <TableCell>
                              {d.type === 'percentage' ? `${d.amount}%` : fmtCur(Number(d.amount), d.currency ?? 'EUR')}
                              {d.recur ? (isEnglish ? ' (recurring)' : ' (recorrente)') : (isEnglish ? ' (1st charge)' : ' (1.ª cobrança)')}
                            </TableCell>
                            <TableCell>{d.times_used}{d.usage_limit ? ` / ${d.usage_limit}` : ''}</TableCell>
                            <TableCell>
                              <Badge variant={state === 'ativo' || state === 'active' ? 'default' : 'secondary'}>{state}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {d.expires_at ? new Date(d.expires_at).toLocaleDateString(isEnglish ? 'en-GB' : 'pt-PT') : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{isEnglish ? 'Promo codes (database table)' : 'Códigos de Promoção (tabela da base de dados)'}</CardTitle>
                  <CardDescription>{isEnglish ? 'Internal promo codes, separate from Paddle discounts' : 'Códigos internos, separados dos descontos Paddle'}</CardDescription>
                </div>
                <Button 
                  onClick={() => { 
                    setEditingPromoId(null); 
                    setPromoDialogOpen(true); 
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {isEnglish ? 'New code' : 'Novo Código'}
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">{isEnglish ? 'Loading...' : 'A carregar...'}</p>
                  </div>
                ) : promoCodes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">{isEnglish ? 'No promo codes created yet' : 'Nenhum código de promoção criado'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {promoCodes.map(promo => (
                      <div 
                        key={promo.id} 
                        className="border rounded-lg p-4 flex items-start justify-between hover:bg-muted/50 transition"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="px-2 py-1 bg-muted rounded font-mono font-bold text-sm">
                              {promo.code}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleCopyPromoCode(promo.code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            {promo.is_active ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {isEnglish ? 'Active' : 'Ativo'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <XCircle className="h-3 w-3 mr-1" />
                                {isEnglish ? 'Inactive' : 'Inativo'}
                              </Badge>
                            )}
                          </div>
                          {promo.description && (
                            <p className="text-sm text-muted-foreground mb-2">{promo.description}</p>
                          )}
                          <div className="flex gap-4 text-sm">
                            <span>
                              <strong>{isEnglish ? 'Discount:' : 'Desconto:'}</strong> {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : promo.discount_type === 'fixed' ? `€${(promo.discount_value ?? 0).toFixed(2)}` : `${promo.discount_value} ${isEnglish ? 'days' : 'dias'}`}
                            </span>
                            {promo.discount_type !== 'free_days' && (
                              <span>
                                <strong>{isEnglish ? 'Duration:' : 'Duração:'}</strong> {promo.duration_months > 0 ? `${promo.duration_months} ${isEnglish ? 'months' : 'meses'}` : (isEnglish ? 'Applies once' : 'Aplica uma vez')}
                              </span>
                            )}
                            <span>
                              <strong>{isEnglish ? 'Uses:' : 'Utilizações:'}</strong> {promo.current_uses} / {promo.max_uses}
                            </span>
                            <span>
                              <strong>{isEnglish ? 'Expires:' : 'Expira:'}</strong> {format(new Date(promo.expires_at), 'dd/MM/yyyy')}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => { 
                              setEditingPromoId(promo.id); 
                              setPromoDialogOpen(true); 
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeletePromo(promo.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Anti-fraud alerts */}
          <TabsContent value="alerts">
            <AdminFraudFlags isEnglish={isEnglish} />
          </TabsContent>
        </Tabs>

        {/* Promo Code Dialog */}
        <PromoCodeDialog 
          open={promoDialogOpen} 
          onOpenChange={setPromoDialogOpen}
          editingId={editingPromoId}
          onSuccess={fetchData}
        />
      </motion.div>
    </div>
  );
}
