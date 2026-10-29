import { useEffect, useState } from 'react';
import { Check, Sparkles, Zap, Lightbulb, Loader2, Ticket, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { usePlanStore } from '@/stores/planStore';
import { useAuthStore } from '@/stores/authStore';
import { PlanType } from '@/types/plans';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

type PricingPlan = {
  id: PlanType;
  name: string;
  description: string;
  price: string;
  priceDetail: string;
  features: string[];
  cta: string;
  highlight?: boolean;
};

type ProPromo = {
  code: string;
  discount_type: 'percentage' | 'fixed' | 'free_days';
  discount_value: number;
  duration_months: number;
};

export default function Pricing() {
  const { currentPlan, setPlan } = usePlanStore();
  const { user, isLoading: authLoading } = useAuthStore();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');

  const [isLoadingPro, setIsLoadingPro] = useState(false);

  // Promo dialog state (mínimo para compilar + funcionar)
  const [showProPromoDialog, setShowProPromoDialog] = useState(false);
  const [proPromoInput, setProPromoInput] = useState('');
  const [proPromoError, setProPromoError] = useState('');
  const [proAppliedPromo, setProAppliedPromo] = useState<ProPromo | null>(null);
  // Campaign links: /pricing?code=EARLY-A1. Kept in sessionStorage so it survives the login redirect.
  const [searchParams] = useSearchParams();
  const [urlCode, setUrlCode] = useState<string>(() => {
    const c = (searchParams.get('code') || sessionStorage.getItem('pf_checkout_code') || '').trim().toUpperCase();
    return /^[A-Z0-9-]{3,32}$/.test(c) ? c : '';
  });
  useEffect(() => {
    const c = (searchParams.get('code') || '').trim().toUpperCase();
    if (/^[A-Z0-9-]{3,32}$/.test(c)) { sessionStorage.setItem('pf_checkout_code', c); setUrlCode(c); }
  }, [searchParams]);

  // Campaign/channel that brought the user here (set by trackCampaignLanding), passed to Paddle for attribution.
  const campaignAttribution = (): Record<string, string> => {
    try { const v = JSON.parse(sessionStorage.getItem('pf_campaign') || 'null'); return v?.c ? { campaign: String(v.c).slice(0, 40), ...(v.r ? { campaignSend: String(v.r) } : {}) } : {}; } catch { return {}; }
  };
  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (!urlCode || autoOpened || authLoading || !user || currentPlan === 'pro') return;
    setAutoOpened(true);
    setProPromoInput(urlCode);
    setShowProPromoDialog(true);
  }, [urlCode, autoOpened, authLoading, user, currentPlan]);

  const mainPlans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Free',
      description: isEnglish ? 'To explore and test' : 'Para explorar e testar',
      price: '0€',
      priceDetail: isEnglish ? 'forever' : 'para sempre',
      features: isEnglish
        ? ['3 optimizations per prompt', 'Prompt library', 'Basic guided builder', 'Pack previews', '4 free Learn lessons']
        : ['3 otimizações por prompt', 'Biblioteca de prompts', 'Guided Builder básico', 'Pré-visualização de packs', '4 lições grátis do Aprender'],
      cta: isEnglish ? 'Start free' : 'Começar grátis',
    },
    {
      id: 'pro',
      name: 'Pro',
      description: isEnglish
        ? 'For users who rely on PromptForge every day at work'
        : 'Para quem usa o PromptForge como ferramenta diária de trabalho',
      price: '9€',
      priceDetail: isEnglish ? '/month' : '/mês',
      features: isEnglish
        ? ['9€/month, cancel anytime', 'Unlimited optimizations', 'Version history', 'A/B prompt testing', 'Detailed scoring', 'Prompt export', 'All Learn lessons']
        : ['9€/mês, cancela quando quiseres', 'Otimizações ilimitadas', 'Histórico de versões', 'Testes A/B de prompts', 'Pontuação detalhada', 'Exportação de prompts', 'Todas as lições do Aprender'],
      cta: isEnglish ? 'Get Pro' : 'Subscrever o Pro',
      highlight: true,
    },
  ];

  const premiumPlan: PricingPlan = {
    id: 'premium',
    name: 'Premium',
    description: isEnglish ? 'Full access to Prompt Packs' : 'Acesso completo aos Prompt Packs',
    price: '19€',
    priceDetail: isEnglish ? '— one-time payment' : '— pagamento único',
    features: isEnglish
      ? ['All premium Prompt Packs', 'Hooks, scripts, structures and CTAs', 'Professional templates', 'All Learn lessons', 'Future updates included']
      : ['Todos os Prompt Packs premium', 'Hooks, scripts, estruturas e CTAs', 'Templates profissionais', 'Todas as lições do Aprender', 'Atualizações futuras incluídas'],
    cta: isEnglish ? 'Unlock full access' : 'Desbloquear acesso completo',
  };

  const handleSelectPlan = async (planId: PlanType) => {
    if (planId === 'premium') {
      navigate('/checkout');
      return;
    }

    if (planId === 'pro') {
      if (!authLoading && !user) {
        toast({
          title: isEnglish ? 'Authentication required' : 'Autenticação necessária',
          description: isEnglish ? 'You must sign in to subscribe to Pro.' : 'Tens de iniciar sessão para subscrever o plano Pro.',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }
      if (authLoading) return;
      // Show confirmation dialog (optional promo code; ?code= from a campaign link is prefilled).
      setProAppliedPromo(null);
      if (urlCode) setProPromoInput(urlCode);
      setShowProPromoDialog(true);
      return;
    }

    setPlan(planId);
  };

  const removeProPromo = () => {
    setProAppliedPromo(null);
    setProPromoError('');
    setProPromoInput('');
  };

  const handleApplyProPromo = async () => {
    const code = proPromoInput.trim().toUpperCase();
    if (!code) return;

    setProPromoError('');

    const { data, error } = await supabase.rpc('validate_promo_code', {
      _code: code,
      _plan: 'pro',
    });

    if (error) {
      const msg = error.message || '';
      const map: Record<string, string> = {
        PROMO_NOT_FOUND: isEnglish ? 'Invalid code.' : 'Código inválido.',
        PROMO_INACTIVE: isEnglish ? 'Inactive code.' : 'Código inativo.',
        PROMO_EXPIRED: isEnglish ? 'Expired code.' : 'Código expirado.',
        PROMO_LIMIT_REACHED: isEnglish ? 'Code usage limit reached.' : 'Código atingiu o limite de utilizações.',
        PROMO_NOT_APPLICABLE: isEnglish ? 'Code not valid for this plan.' : 'Código não aplicável a este plano.',
      };
      if (msg.includes('PROMO_NOT_FOUND')) {
        // Not an in-app promo: may be a Paddle discount code (e.g. campaign codes). Paddle validates it at checkout.
        setProPromoError(isEnglish ? 'This code will be checked and applied at checkout.' : 'Este código será verificado e aplicado no checkout.');
        return;
      }
      const key = Object.keys(map).find((k) => msg.includes(k));
      setProPromoError(key ? map[key] : (isEnglish ? 'Could not verify the code.' : 'Não foi possível verificar o código.'));
      return;
    }

    const promo = (data as any[])?.[0];
    if (!promo) {
      setProPromoError(isEnglish ? 'Invalid code.' : 'Código inválido.');
      return;
    }

    setProAppliedPromo({
      code: promo.code,
      discount_type: promo.discount_type as ProPromo['discount_type'],
      discount_value: Number(promo.discount_value),
      duration_months: promo.duration_months ?? 0,
    });
    setProPromoError('');
  };

  const handleConfirmProSubscription = async () => {
    setShowProPromoDialog(false);
    setIsLoadingPro(true);

    try {
      if (!user) {
        navigate('/login');
        return;
      }

      // Pre-checkout anti-fraud / trial-redemption / velocity check. Discount codes (typed, in-app promo or
      // /pricing?code=XXX campaign links) are validated server-side (confirmed email, once per account) and the
      // Paddle transaction with the discount is created there; we only open it.
      const intent = 'pro_normal';
      const code = (proAppliedPromo?.code || proPromoInput.trim() || urlCode || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); // Paddle codes are alphanumeric (EARLY-A1 -> EARLYA1)
      const { initializePaddle, getPaddlePriceId, getPaddleEnvironment, setCheckoutAttemptId } = await import('@/lib/paddle');
      const attribution = campaignAttribution();
      let attemptId: string | undefined;
      let transactionId: string | undefined;
      const reasonMap: Record<string, string> = {
        disposable_email: isEnglish
          ? 'Disposable email addresses are not allowed. Please use a permanent email.'
          : 'Emails temporários não são permitidos. Usa um email permanente.',
        too_many_attempts: isEnglish
          ? 'Too many failed payment attempts. Please try again in 24 hours.'
          : 'Demasiadas tentativas de pagamento falhadas. Tenta novamente dentro de 24 horas.',
        too_many_attempts_ip: isEnglish
          ? 'Too many checkout attempts from this network. Please try again later.'
          : 'Demasiadas tentativas de checkout a partir desta rede. Tenta novamente mais tarde.',
        email_not_confirmed: isEnglish
          ? 'Please confirm your email address before using a discount code.'
          : 'Confirma o teu email antes de usar um código de desconto.',
        code_already_used: isEnglish
          ? 'This discount code has already been used on your account.'
          : 'Este código de desconto já foi usado na tua conta.',
        invalid_code: isEnglish ? 'Invalid discount code.' : 'Código de desconto inválido.',
        code_expired: isEnglish ? 'This discount code has expired.' : 'Este código de desconto expirou.',
        code_limit_reached: isEnglish ? 'This discount code has reached its usage limit.' : 'Este código atingiu o limite de utilizações.',
        code_not_applicable: isEnglish ? 'This code is not valid for this plan.' : 'Este código não é válido para este plano.',
        checkout_unavailable: isEnglish ? 'Checkout is temporarily unavailable. Please try again.' : 'O checkout está temporariamente indisponível. Tenta novamente.',
      };
      try {
        const { data: check, error: checkErr } = await supabase.functions.invoke('pre-checkout-check', {
          body: { intent, ...(code ? { discountCode: code, environment: getPaddleEnvironment(), ...attribution } : {}) },
        });
        if (check && check.allowed === false) {
          toast({
            title: isEnglish ? 'Checkout blocked' : 'Checkout bloqueado',
            description: reasonMap[check.reason as string] ?? (isEnglish ? 'Unable to proceed.' : 'Não foi possível prosseguir.'),
            variant: 'destructive',
          });
          setIsLoadingPro(false);
          return;
        }
        if (checkErr && code) throw checkErr; // codes need the server-created transaction
        if (typeof check?.attemptId === 'string') attemptId = check.attemptId;
        if (typeof check?.transactionId === 'string') transactionId = check.transactionId;
      } catch (e) {
        if (code) throw e;
        // Fail open (no code) — pre-check should not block checkout on internal errors.
        console.warn('pre-checkout-check failed, continuing', e);
      }
      if (code && !transactionId) throw new Error('No transaction for discount code');

      await initializePaddle();
      setCheckoutAttemptId(attemptId);
      const attemptData: Record<string, string> = attemptId ? { attemptId } : {};
      const settings = {
        displayMode: 'overlay',
        successUrl: `${window.location.origin}/subscription-success`,
        allowLogout: false,
        variant: 'one-page',
      };

      if (transactionId) {
        // Discount flow: transaction (price + discount + customer + customData) created server-side.
        window.Paddle.Checkout.open({ transactionId, settings });
      } else {
        // Default flow: Pro monthly (9€/month).
        const subscriptionId = await getPaddlePriceId('pro_monthly');
        window.Paddle.Checkout.open({
          items: [{ priceId: subscriptionId, quantity: 1 }],
          customer: { email: user.email! },
          customData: { userId: user.id, ...attribution, ...attemptData },
          settings,
        });
      }
    } catch (err) {
      console.error('Subscription error:', err);
      toast({
        title: isEnglish ? 'Subscription creation error' : 'Erro ao criar subscrição',
        description: isEnglish ? 'Please try again.' : 'Por favor tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPro(false);
    }
  };

  const BASE_PRO_PRICE = 9;
  const proIsFreeDays = proAppliedPromo?.discount_type === 'free_days';
  const proDiscount = proAppliedPromo && !proIsFreeDays
    ? proAppliedPromo.discount_type === 'percentage'
      ? Math.min(BASE_PRO_PRICE, (BASE_PRO_PRICE * proAppliedPromo.discount_value) / 100)
      : Math.min(BASE_PRO_PRICE, proAppliedPromo.discount_value)
    : 0;
  const proFinalPrice = Math.max(0, BASE_PRO_PRICE - proDiscount);

  return (
    <div className="p-6 md:p-8 lg:p-10 animate-fade-in">
      <header className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          {isEnglish ? 'Choose how you want to use PromptForge' : 'Escolhe como queres usar o PromptForge'}
        </h1>
        <p className="text-muted-foreground text-lg">
          {isEnglish
            ? 'Ready packs for immediate results or advanced tools for daily creators.'
            : 'Packs prontos para resultados imediatos ou ferramentas avançadas para quem cria todos os dias.'}
        </p>
      </header>

      <div className="mb-10 max-w-2xl mx-auto">
        <div className="bg-muted/50 border border-border rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm mb-1">{isEnglish ? 'How it works' : 'Como funciona'}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isEnglish ? 'Most creators start with ' : 'A maioria dos criadores começa pelos '}
                <span className="font-medium text-foreground">Prompt Packs</span>
                {isEnglish ? ' — ready to use, with fast results.' : ' — prontos a usar, com resultados rápidos.'}
                <br />
                {isEnglish
                  ? 'Plans are ideal for ongoing professional workflows.'
                  : 'Os planos são para quem usa o PromptForge como ferramenta de trabalho contínua.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {mainPlans.map((plan) => {
          const isActive = currentPlan === plan.id;
          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col transition-all ${
                plan.highlight
                  ? 'border-primary shadow-lg shadow-primary/10 md:scale-[1.02]'
                  : 'border-border hover:border-muted-foreground/30'
              } ${isActive ? 'ring-2 ring-primary' : ''}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 whitespace-nowrap">
                    <Sparkles className="h-3 w-3" />
                    {isEnglish ? 'Recommended' : 'Recomendado'}
                  </span>
                </div>
              )}

              <CardHeader className={`text-center pb-4 ${plan.highlight ? 'pt-6' : ''}`}>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
                <div className="pt-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.priceDetail}</span>
                  </div>
                  {plan.id === 'pro' && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {isEnglish ? 'Then 9€/month — cancel anytime.' : 'Depois 9€/mês — cancela quando quiseres.'}
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col space-y-6">
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={`h-4 w-4 shrink-0 mt-0.5 ${
                          plan.highlight ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${plan.highlight ? 'shadow-md' : ''}`}
                  variant={plan.highlight ? 'default' : 'outline'}
                  disabled={isActive}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isActive ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {isEnglish ? 'Current plan' : 'Plano atual'}
                    </>
                  ) : (
                    <>
                      {plan.highlight && <Sparkles className="h-4 w-4 mr-2" />}
                      {plan.cta}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-16 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {isEnglish ? 'One-time purchase' : 'Compra única'}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Card className={`border-border ${currentPlan === 'premium' ? 'ring-2 ring-primary' : ''}`}>
          <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-semibold">{premiumPlan.name}</h3>
                <span className="bg-primary/15 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                  {isEnglish ? 'One-time payment' : 'Pagamento único'}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold">19€</span>
                  <span className="text-muted-foreground text-sm">
                    {isEnglish ? '— lifetime access' : '— acesso vitalício'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{premiumPlan.description}</p>
              <p className="text-xs text-muted-foreground">
                {isEnglish
                  ? 'Immediate access after purchase. Future updates included.'
                  : 'Acesso imediato após compra. Atualizações futuras incluídas.'}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
                {premiumPlan.features.map((feature) => (
                  <span key={feature} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-muted-foreground" />
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <Button
              className="shrink-0 shadow-md"
              disabled={currentPlan === 'premium'}
              onClick={() => handleSelectPlan('premium')}
            >
              {currentPlan === 'premium' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {isEnglish ? 'Current plan' : 'Plano atual'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {premiumPlan.cta}
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      <footer className="text-center mt-12 md:mt-16 max-w-lg mx-auto">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isEnglish
            ? 'Questions? The Free plan never expires — use it as long as you need.'
            : 'Dúvidas? O plano Free não expira — usa o tempo que precisares.'}
        </p>
      </footer>

      {/* Pro Promo Code Dialog */}
      <Dialog open={showProPromoDialog} onOpenChange={setShowProPromoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEnglish ? 'Subscribe to Pro' : 'Subscrever o Pro'}</DialogTitle>
            <DialogDescription>
              {isEnglish
                ? '9€/month — cancel anytime in your account.'
                : '9€/mês — cancela quando quiseres na tua conta.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="text-center">
              {proAppliedPromo && proIsFreeDays ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-foreground">
                    {BASE_PRO_PRICE}€/{isEnglish ? 'month' : 'mês'}
                  </span>
                  <span className="text-xs text-primary font-medium">
                    {isEnglish
                      ? `${proAppliedPromo.discount_value} free days with ${proAppliedPromo.code}, then normal price`
                      : `${proAppliedPromo.discount_value} dias grátis com ${proAppliedPromo.code}, depois preço normal`}
                  </span>
                </div>
              ) : proAppliedPromo && proDiscount > 0 ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm text-muted-foreground line-through">
                    {BASE_PRO_PRICE}€/{isEnglish ? 'month' : 'mês'}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {proFinalPrice.toFixed(2)}€ <span className="text-sm font-medium">{isEnglish ? 'first month' : 'no primeiro mês'}</span>
                  </span>
                  <span className="text-xs text-primary font-medium">
                    {isEnglish
                      ? `Then ${BASE_PRO_PRICE}€/month — cancel anytime`
                      : `Depois ${BASE_PRO_PRICE}€/mês — cancela quando quiseres`}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-foreground">
                  {BASE_PRO_PRICE}€/{isEnglish ? 'month' : 'mês'}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                <span className="inline-flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  {isEnglish ? 'Promo code (optional)' : 'Código de promoção (opcional)'}
                </span>
              </Label>

              {proAppliedPromo ? (
                <div className="flex items-center justify-between gap-2 px-3 h-10 rounded-md border border-primary/40 bg-primary/10">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{proAppliedPromo.code}</span>
                    <span className="text-muted-foreground">
                      ({proAppliedPromo.discount_type === 'percentage'
                        ? `-${proAppliedPromo.discount_value}%`
                        : proAppliedPromo.discount_type === 'fixed'
                        ? `-${proAppliedPromo.discount_value}€`
                        : `${proAppliedPromo.discount_value} ${isEnglish ? 'free days' : 'dias grátis'}`}
                      {proAppliedPromo.discount_type !== 'free_days' && proAppliedPromo.duration_months > 0
                        ? ` · ${proAppliedPromo.duration_months} ${isEnglish ? 'months' : 'meses'}`
                        : ''})
                    </span>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={removeProPromo}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="EX: SUMMER20"
                    value={proPromoInput}
                    onChange={(e) => {
                      setProPromoInput(e.target.value.toUpperCase());
                      setProPromoError('');
                    }}
                    className="h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyProPromo}
                    disabled={!proPromoInput.trim()}
                    className="h-10"
                  >
                    {isEnglish ? 'Apply' : 'Aplicar'}
                  </Button>
                </div>
              )}

              {proPromoError && <p className={`text-xs ${/checkout/.test(proPromoError) ? 'text-primary' : 'text-destructive'}`} data-testid="promo-msg">{proPromoError}</p>}
              {!proAppliedPromo && !proPromoError && proPromoInput.trim() && proPromoInput.trim().toUpperCase() === urlCode && (
                <p className="text-xs text-primary" data-testid="promo-url-code">
                  {isEnglish ? `Code ${urlCode} will be applied at checkout.` : `O código ${urlCode} será aplicado no checkout.`}
                </p>
              )}
            </div>

            <Button className="w-full" onClick={handleConfirmProSubscription} disabled={isLoadingPro}>
              {isLoadingPro ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEnglish ? 'Redirecting to secure checkout...' : 'A redirecionar para checkout seguro...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  {isEnglish ? 'Continue to payment' : 'Continuar para pagamento'}
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
