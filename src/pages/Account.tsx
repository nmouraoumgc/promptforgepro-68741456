import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Mail, CreditCard, LogOut, Crown, Zap, Sparkles, ReceiptText, Loader2, KeyRound, Gauge, Trash2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { invokeRun } from '@/components/run/RunPrompt';
import { useBrandLimit, useBrandProfiles } from '@/data/brandDb';
import { usePromptStore } from '@/stores/promptStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { PLAN_INFO } from '@/types/plans';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsEnglish, localizeApiError } from '@/i18n/lang';

export default function Account() {
  const { t } = useTranslation();
  const isEnglish = useIsEnglish();
  const navigate = useNavigate();
  const { user, profile, signOut, isLoading } = useAuthStore();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { toast } = useToast();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const L = (pt: string, en: string) => (isEnglish ? en : pt);
  const qc = useQueryClient();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const [curPw, setCurPw] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delText, setDelText] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const { profiles: brands } = useBrandProfiles();
  const brandLimit = useBrandLimit();
  const libraryCount = usePromptStore((s) => s.prompts.length);
  const confirmWord = isEnglish ? 'DELETE' : 'APAGAR';

  useEffect(() => { setName(profile?.display_name ?? ''); }, [profile?.display_name]);

  const subQ = useQuery({
    queryKey: ['my-subscription', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('subscriptions')
        .select('status, current_period_end, cancel_at_period_end, environment')
        .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      return data as { status: string; current_period_end: string | null; cancel_at_period_end: boolean | null } | null;
    },
  });
  const usageQ = useQuery({
    queryKey: ['run-usage', user?.id],
    enabled: !!user,
    queryFn: async () => { const d = await invokeRun({ peek: true }); return typeof d?.limit === 'number' ? { used: d.used ?? 0, limit: d.limit } : null; },
  });

  const saveName = async () => {
    if (!user) return;
    setSavingName(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('profiles').update({ display_name: name.trim().slice(0, 80) || null }).eq('id', user.id);
    setSavingName(false);
    if (error) { toast({ title: L('Não foi possível guardar o nome', 'Could not save the name'), variant: 'destructive' }); return; }
    await fetchProfile();
    toast({ title: L('Nome guardado', 'Name saved') });
  };

  const changeEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast({ title: L('Email inválido', 'Invalid email'), variant: 'destructive' }); return; }
    if (email === user?.email) { toast({ title: L('Esse já é o teu email', 'That is already your email') }); return; }
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${window.location.origin}/account` });
    setEmailBusy(false);
    if (error) { toast({ title: L('Não foi possível alterar o email', 'Could not change the email'), description: error.message, variant: 'destructive' }); return; }
    setEmailSent(email); setNewEmail('');
  };

  const changePassword = async () => {
    if (!user?.email) return;
    if (pw1.length < 8) { toast({ title: L('A palavra-passe precisa de pelo menos 8 caracteres', 'Password needs at least 8 characters'), variant: 'destructive' }); return; }
    if (pw1 !== pw2) { toast({ title: L('As palavras-passe não coincidem', 'Passwords do not match'), variant: 'destructive' }); return; }
    setPwBusy(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: curPw });
    if (authErr) { setPwBusy(false); toast({ title: L('Palavra-passe atual incorreta', 'Current password is incorrect'), variant: 'destructive' }); return; }
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setPwBusy(false);
    if (error) { toast({ title: L('Não foi possível alterar a palavra-passe', 'Could not change the password'), description: error.message, variant: 'destructive' }); return; }
    setCurPw(''); setPw1(''); setPw2('');
    toast({ title: L('Palavra-passe alterada', 'Password changed') });
  };

  const deleteAccount = async () => {
    setDelBusy(true); setDelError(null);
    const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirm: delText } });
    let code = data?.code as string | undefined;
    if (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      try { const j = await (error as any).context?.json?.(); code = j?.code; } catch { /* ignore */ }
    }
    setDelBusy(false);
    if (data?.deleted) {
      qc.clear();
      await signOut();
      toast({ title: L('Conta apagada', 'Account deleted'), description: L('Os teus dados foram removidos.', 'Your data has been removed.') });
      navigate('/login');
      return;
    }
    setDelError(code === 'ACTIVE_SUBSCRIPTION'
      ? L('Tens uma subscrição ativa. Cancela-a primeiro no portal de faturação e tenta de novo.', 'You have an active subscription. Cancel it in the billing portal first, then try again.')
      : code === 'CONFIRM' ? L(`Escreve ${confirmWord} para confirmar.`, `Type ${confirmWord} to confirm.`)
      : L('Não foi possível apagar a conta. Tenta mais tarde.', 'Could not delete the account. Please try later.'));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (isLoading && !user) {
    return (
      <div className="p-6 md:p-8 lg:p-10 animate-fade-in">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const currentPlan = profile?.current_plan || 'free';
  const planInfo = PLAN_INFO[currentPlan];

  const getPlanIcon = () => {
    switch (currentPlan) {
      case 'premium':
      case 'packs': return <Sparkles className="h-5 w-5" />;
      case 'pro': return <Zap className="h-5 w-5" />;
      default: return <Crown className="h-5 w-5" />;
    }
  };

  const handleOpenBillingPortal = async () => {
    if (!user) return;
    setIsOpeningPortal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: t('plans.authNeeded'),
          description: t('plans.authNeededDesc'),
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(localizeApiError(data.error, isEnglish));

      if (data?.no_billing) {
        toast({
          title: t('account.noBillingTitle'),
          description: t('account.noBillingDesc'),
        });
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No customer portal URL returned');
      }
    } catch (error) {
      console.error('Customer portal error:', error);
      toast({
        title: t('account.billingErrorTitle'),
        description: t('account.billingErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">{t('account.title')}</h1>
            <p className="text-muted-foreground">{t('account.subtitle')}</p>
          </header>

          <div className="space-y-6">
            <Card data-testid="account-profile">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('account.profile')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{t('account.email')}</p>
                    <p className="font-medium break-all" data-testid="account-email">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acc-name">{L('Nome', 'Name')}</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input id="acc-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={L('Como te devemos chamar?', 'What should we call you?')} />
                    <Button onClick={saveName} disabled={savingName || name.trim() === (profile?.display_name ?? '')} data-testid="acc-name-save">
                      {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : L('Guardar', 'Save')}
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="acc-email">{L('Alterar email', 'Change email')}</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input id="acc-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={L('novo@email.com', 'new@email.com')} />
                    <Button variant="outline" onClick={changeEmail} disabled={emailBusy || !newEmail.trim()} data-testid="acc-email-save">
                      {emailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : L('Alterar', 'Change')}
                    </Button>
                  </div>
                  {emailSent && (
                    <p className="text-sm text-success" data-testid="acc-email-sent">
                      {L(`Enviámos um link de confirmação para ${emailSent}. O email só muda depois de confirmares (pode também ser pedida confirmação no email atual).`,
                         `We sent a confirmation link to ${emailSent}. Your email only changes after you confirm (your current email may also need to confirm).`)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="account-password">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />{L('Palavra-passe', 'Password')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1"><Label htmlFor="acc-pw-cur">{L('Palavra-passe atual', 'Current password')}</Label>
                  <Input id="acc-pw-cur" type="password" autoComplete="current-password" value={curPw} onChange={(e) => setCurPw(e.target.value)} /></div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label htmlFor="acc-pw-1">{L('Nova palavra-passe', 'New password')}</Label>
                    <Input id="acc-pw-1" type="password" autoComplete="new-password" value={pw1} onChange={(e) => setPw1(e.target.value)} /></div>
                  <div className="space-y-1"><Label htmlFor="acc-pw-2">{L('Confirmar nova', 'Confirm new')}</Label>
                    <Input id="acc-pw-2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
                </div>
                <Button onClick={changePassword} disabled={pwBusy || !curPw || !pw1 || !pw2} data-testid="acc-pw-save">
                  {pwBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : L('Alterar palavra-passe', 'Change password')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t('account.currentPlan')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      currentPlan === 'premium' || currentPlan === 'packs' ? 'bg-primary/10 text-primary' :
                      currentPlan === 'pro' ? 'bg-info/10 text-info' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {getPlanIcon()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">{planInfo.name}</p>
                        <Badge variant={currentPlan === 'free' ? 'secondary' : 'default'}>
                          {isEnglish ? planInfo.taglineEn : planInfo.tagline}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {currentPlan === 'free' && t('account.freeDesc')}
                        {currentPlan === 'pro' && t('account.proDesc')}
                        {currentPlan === 'packs' && t('account.packsDesc')}
                        {currentPlan === 'premium' && t('account.premiumDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground" data-testid="account-sub-status">
                  {subQ.data ? (
                    <>
                      {L('Estado', 'Status')}: <span className="font-medium text-foreground">{({ active: L('Ativa', 'Active'), trialing: L('Em período de teste', 'Trial'), past_due: L('Pagamento em atraso', 'Past due'), paused: L('Pausada', 'Paused'), canceled: L('Cancelada', 'Cancelled') } as Record<string, string>)[subQ.data.status] ?? subQ.data.status}</span>
                      {subQ.data.current_period_end && (
                        <> · {subQ.data.cancel_at_period_end ? L('Termina a', 'Ends on') : L('Renova a', 'Renews on')}{' '}
                          <span className="font-medium text-foreground">{new Date(subQ.data.current_period_end).toLocaleDateString(isEnglish ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}</span></>
                      )}
                    </>
                  ) : currentPlan === 'free'
                    ? L('Sem subscrição paga.', 'No paid subscription.')
                    : L('Plano atribuído sem subscrição recorrente.', 'Plan granted without a recurring subscription.')}
                </div>

                <Separator />

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => navigate('/pricing')}>
                    {t('account.viewPlans')}
                  </Button>
                  {/* Upgrades always point to Pro. Pro, grandfathered Premium and admins have no upgrade. */}
                  {(currentPlan === 'free' || currentPlan === 'packs') && !isAdmin && (
                    <Button onClick={() => navigate('/pricing')}>
                      {t('account.upgrade')}
                    </Button>
                  )}
                  {(currentPlan === 'pro' || currentPlan === 'premium' || isAdmin) && subQ.data && (
                    <Button onClick={handleOpenBillingPortal}>
                      {isEnglish ? 'Manage subscription' : 'Gerir subscrição'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="account-usage">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" />{L('Utilização', 'Usage')}</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4 text-sm">
                <div><p className="text-muted-foreground">{L('Execuções hoje', 'Runs today')}</p>
                  <p className="text-2xl font-semibold" data-testid="usage-runs">{usageQ.data ? `${usageQ.data.used} / ${usageQ.data.limit}` : '-'}</p></div>
                <div><p className="text-muted-foreground">{L('Perfis de marca', 'Brand profiles')}</p>
                  <p className="text-2xl font-semibold" data-testid="usage-brands">{brands.length} / {Number.isFinite(brandLimit) ? brandLimit : '∞'}</p></div>
                <div><p className="text-muted-foreground">{L('Prompts na biblioteca', 'Library prompts')}</p>
                  <p className="text-2xl font-semibold" data-testid="usage-library">{libraryCount}</p></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('account.actions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" className="w-full sm:w-auto" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('account.signOut')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5" />
                  {t('account.billingTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('account.billingDesc')}</p>
                <ul className="text-sm space-y-1 text-foreground">
                  <li>• {t('account.billingFeatureMethods')}</li>
                  <li>• {t('account.billingFeatureInvoices')}</li>
                  <li>• {t('account.billingFeatureManage')}</li>
                </ul>
                <Button
                  variant="outline"
                  onClick={handleOpenBillingPortal}
                  disabled={isOpeningPortal}
                  className="w-full sm:w-auto"
                >
                  {isOpeningPortal ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('account.openingPortal')}
                    </>
                  ) : (
                    t('account.openBillingPortal')
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">{L('As faturas estão disponíveis no portal de faturação (Paddle), na secção de pagamentos.', 'Invoices are available in the billing portal (Paddle), under payments.')}</p>
              </CardContent>
            </Card>

            <Card className="border-destructive/40" data-testid="account-danger">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />{L('Apagar conta', 'Delete account')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{L('Apaga permanentemente a tua conta, biblioteca, perfis de marca e progresso. Não pode ser desfeito. Se tens uma subscrição ativa, cancela-a primeiro no portal de faturação.',
                  'Permanently deletes your account, library, brand profiles and progress. This cannot be undone. If you have an active subscription, cancel it in the billing portal first.')}</p>
                <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => { setDelOpen(true); setDelText(''); setDelError(null); }} data-testid="acc-delete-open">
                  <Trash2 className="h-4 w-4 mr-2" />{L('Pedir eliminação da conta', 'Request account deletion')}
                </Button>
              </CardContent>
            </Card>

            <Dialog open={delOpen} onOpenChange={setDelOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{L('Apagar a conta de vez?', 'Delete your account for good?')}</DialogTitle>
                  <DialogDescription>{L(`Escreve ${confirmWord} para confirmar. Esta ação não pode ser desfeita.`, `Type ${confirmWord} to confirm. This cannot be undone.`)}</DialogDescription>
                </DialogHeader>
                <Input value={delText} onChange={(e) => setDelText(e.target.value)} placeholder={confirmWord} data-testid="acc-delete-input" autoComplete="off" />
                {delError && <p className="text-sm text-destructive" data-testid="acc-delete-error">{delError}</p>}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDelOpen(false)}>{L('Cancelar', 'Cancel')}</Button>
                  <Button variant="destructive" disabled={delBusy || delText.trim().toUpperCase() !== confirmWord} onClick={deleteAccount} data-testid="acc-delete-confirm">
                    {delBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : L('Apagar conta', 'Delete account')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
