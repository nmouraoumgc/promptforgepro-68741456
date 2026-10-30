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
import { saveCampaignCode, getCampaignCode, getCampaignAttribution } from '@/lib/campaignCode';
import { track } from '@/lib/analytics';

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

const searchParamsInit = () => {
  try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(); }
};

// Pro prices (EUR). Annual = 10 x monthly (2 months free).
const PRO_MONTHLY_PRICE = 9;
const PRO_ANNUAL_PRICE = 90;

export default function Pricing() {
  const { currentPlan, setPlan } = usePlanStore();
  const { user, isLoading: authLoading } = useAuthStore();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');

  const [isLoadingPro, setIsLoadingPro] = useState(false);
  // Pro billing interval: /pricing?billing=annual preselects the annual price (90€/year).
  const [billing, setBilling] = useState<'monthly' | 'annual'>(() =>
    (searchParamsInit().get('billing') || '').toLowerCase().startsWith('annual') ? 'annual' : 'monthly');
  const isAnnual = billing === 'annual';

  // Promo dialog state (mínimo para compilar + funcionar)
  const [showProPromoDialog, setShowProPromoDialog] = useState(false);
  const [proPromoInput, setProPromoInput] = useState('');
  const [proPromoError, setProPromoError] = useState('');
  const [proAppliedPromo, setProAppliedPromo] = useState<ProPromo | null>(null);
  // Campaign links: /pricing?code=WELCOME100. Kept in localStorage (30 days) + sessionStorage so it survives
  // signup, email confirmation in a new tab and login (see lib/campaignCode).
  const [searchParams] = useSearchParams();
  const [urlCode, setUrlCode] = useState<string>(() => {
    const c = (searchParams.get('code') || '').trim().toUpperCase();
    if (/^[A-Z0-9-]{3,32}$/.test(c)) saveCampaignCode(c);
    return getCampaignCode();
  });
  useEffect(() => {
    const c = (searchParams.get('code') || '').trim().toUpperCase();
    if (/^[A-Z0-9-]{3,32}$/.test(c)) { saveCampaignCode(c); setUrlCode(c); }
  }, [searchParams]);

  // Campaign/channel that brought the user here (set by trackCampaignLanding), passed to Paddle for attribution.
  const campaignAttribution = (): Record<string, string> => {
    try { const v = getCampaignAttribution(); return v?.c ? { campaign: String(v.c).slice(0, 40), ...(v.r ? { campaignSend: String(v.r) } : {}) } : {}; } catch { return {}; }
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
        : ['3 otimizações por prompt', 'Biblioteca de prompts', 'Criador guiado básico', 'Pré-visualização de packs', '4 lições grátis do Aprender'],
      cta: isEnglish ? 'Start free' : 'Começar grátis',
    },
    {
      id: 'pro',
      name: 'Pro',
      description: isEnglish
        ? 'For users who rely on PromptForge Pro every day at work'
        : 'Para quem usa o PromptForge Pro como ferramenta diária de trabalho',
      price: isAnnual ? `${PRO_ANNUAL_PRICE}€` : `${PRO_MONTHLY_PRICE}€`,
      priceDetail: isAnnual ? (isEnglish ? '/year' : '/ano') : (isEnglish ? '/month' : '/mês'),
      features: isEnglish
        ? ['Unlimited optimizations', 'Version history', 'A/B prompt testing', 'Detailed scoring', 'Prompt export', 'All Learn lessons']
        : ['Otimizações ilimitadas', 'Histórico de versões', 'Testes A/B de prompts', 'Pontuação detalhada', 'Exportação de prompts', 'Todas as lições do Aprender'],
      cta: isEnglish ? 'Get Pro' : 'Subscrever o Pro',
      highlight: true,
    },
  ];

  const premiumPlan: PricingPlan = {
    id: 'premium',
    name: 'Prompt Packs',
    description: isEnglish ? 'Ready-to-use prompt library. Does not include Pro tools.' : 'Biblioteca de prompts prontos a usar. Não inclui as ferramentas do Pro.',
    price: '19€',
    priceDetail: isEnglish ? 'one-time payment' : 'pagamento único',
    features: isEnglish
      ? ['All premium Prompt Packs', 'Hooks, scripts, structures and CTAs', 'Professional templates', 'All Learn lessons', 'Future updates included']
      : ['Todos os Prompt Packs premium', 'Ganchos, guiões, estruturas e CTAs', 'Modelos profissionais', 'Todas as lições do Aprender', 'Atualizações futuras incluídas'],
    cta: isEnglish ? 'Get the Prompt Packs' : 'Comprar os Prompt Packs',
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
        navigate('/login?redirect=/pricing');
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
        navigate('/login?redirect=/pricing');
        return;
      }

      // Pre-checkout anti-fraud / trial-redemption / velocity check. Discount codes (typed, in-app promo or
      // /pricing?code=XXX campaign links) are validated server-side (confirmed email, once per account) and the
      // Paddle transaction with the discount is created there; we only open it.
      const intent = isAnnual ? 'pro_annual' : 'pro_normal';
      const priceKey = isAnnual ? 'pro_annual' : 'pro_monthly';
      const code = (proAppliedPromo?.code || proPromoInput.trim() || urlCode || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); // Paddle codes are alphanumeric (EARLY-A1 -> EARLYA1)
      const { initializePaddle, getPaddlePriceId, getPaddleEnvironment, setCheckoutAttemptId } = await import('@/lib/paddle');
      const { runPreCheckoutCheck, checkoutBlockMessage, checkoutRetryMessage } = await import('@/lib/checkoutGuard');
      const attribution = campaignAttribution();
      // Fail closed: the checkout only opens on an explicit allowed=true from pre-checkout-check.
      const check = await runPreCheckoutCheck({
        intent, environment: getPaddleEnvironment(), ...(code ? { discountCode: code, ...attribution } : {}),
      });
      if (check.status === 'blocked') {
        toast({
          title: isEnglish ? 'Checkout blocked' : 'Pagamento bloqueado',
          description: checkoutBlockMessage(check.reason, isEnglish),
          variant: 'destructive',
        });
        return;
      }
      if (check.status === 'error') {
        toast({ ...checkoutRetryMessage(isEnglish), variant: 'destructive' });
        return;
      }
      const { attemptId, transactionId } = check;
      if (code && !transactionId) {
        toast({ ...checkoutRetryMessage(isEnglish), variant: 'destructive' });
        return;
      }

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
        // Default flow: Pro monthly (9€/month) or Pro annual (90€/year).
        const subscriptionId = await getPaddlePriceId(priceKey);
        window.Paddle.Checkout.open({
          items: [{ priceId: subscriptionId, quantity: 1 }],
          customer: { email: user.email! },
          customData: { userId: user.id, billing, ...attribution, ...attemptData },
          settings,
        });
      }
      track('checkout_opened', { plan: priceKey, has_campaign_code: !!code, ...(code ? { campaign_code: code } : {}) });
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

  const BASE_PRO_PRICE = isAnnual ? PRO_ANNUAL_PRICE : PRO_MONTHLY_PRICE;
  const perUnit = isAnnual ? (isEnglish ? 'year' : 'ano') : (isEnglish ? 'month' : 'mês');
  const proIsFreeDays = proAppliedPromo?.discount_type === 'free_days';
  const proDiscount = proAppliedPromo && !proIsFreeDays
    ? proAppliedPromo.discount_type === 'percentage'
      ? Math.min(BASE_PRO_PRICE, (BASE_PRO_PRICE * proAppliedPromo.discount_value) / 100)
      : Math.min(BASE_PRO_PRICE, proAppliedPromo.discount_value)
    : 0;
  const proFinalPrice = Math.max(0, BASE_PRO_PRICE - proDiscount);

  const billingToggle = (testIdPrefix: string) => (
    <div
      role="radiogroup"
      aria-label={isEnglish ? 'Pro billing period' : 'Período de faturação do Pro'}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 p-1"
    >
      {(['monthly', 'annual'] as const).map((b) => (
        <button
          key={b}
          type="button"
          role="radio"
          aria-checked={billing === b}
          data-testid={`${testIdPrefix}-${b}`}
          onClick={() => setBilling(b)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            billing === b ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {b === 'monthly' ? (isEnglish ? 'Monthly' : 'Mensal') : (isEnglish ? 'Annual' : 'Anual')}
          {b === 'annual' && (
            <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {isEnglish ? '2 months free' : '2 meses grátis'}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-6 md:p-8 lg:p-10 animate-fade-in">
      <header className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          {isEnglish ? 'Choose how you want to use PromptForge Pro' : 'Escolhe como queres usar o PromptForge Pro'}
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
                {isEnglish ? ', ready to use, with fast results.' : ', prontos a usar, com resultados rápidos.'}
                <br />
                {isEnglish
                  ? 'Plans are ideal for ongoing professional workflows.'
                  : 'Os planos são para quem usa o PromptForge Pro como ferramenta de trabalho contínua.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center mb-8">{billingToggle('billing')}</div>

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
                  {plan.id === 'pro' && isAnnual && (
                    <p className="text-sm font-medium text-primary mt-1.5" data-testid="annual-equivalent">
                      {isEnglish ? '7.50€/month, 2 months free' : '7,50€/mês, 2 meses grátis'}
                    </p>
                  )}
                  {plan.id === 'pro' && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {isAnnual
                        ? (isEnglish ? 'Billed yearly. Cancel anytime, access until the end of the year paid.' : 'Faturado anualmente. Cancela quando quiseres, acesso até ao fim do ano pago.')
                        : (isEnglish ? 'No commitment, cancel anytime.' : 'Sem fidelização, cancela quando quiseres.')}
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
            {isEnglish ? 'Just want the prompts?' : 'Só queres os prompts?'}
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
                    {isEnglish ? '· lifetime access' : '· acesso vitalício'}
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
            ? 'Questions? The Free plan never expires, so use it as long as you need.'
            : 'Dúvidas? O plano Free não expira: usa o tempo que precisares.'}
        </p>
      </footer>

      {/* Pro Promo Code Dialog */}
      <Dialog open={showProPromoDialog} onOpenChange={setShowProPromoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEnglish ? 'Subscribe to Pro' : 'Subscrever o Pro'}</DialogTitle>
            <DialogDescription>
              {isAnnual
                ? (isEnglish
                  ? '90€/year (7.50€/month, 2 months free), cancel anytime in your account.'
                  : '90€/ano (7,50€/mês, 2 meses grátis), cancela quando quiseres na tua conta.')
                : (isEnglish
                  ? '9€/month, cancel anytime in your account.'
                  : '9€/mês, cancela quando quiseres na tua conta.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex justify-center">{billingToggle('dialog-billing')}</div>
            <div className="text-center">
              {proAppliedPromo && proIsFreeDays ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-foreground">
                    {BASE_PRO_PRICE}€/{perUnit}
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
                    {BASE_PRO_PRICE}€/{perUnit}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {proFinalPrice.toFixed(2)}€ <span className="text-sm font-medium">{isAnnual ? (isEnglish ? 'first year' : 'no primeiro ano') : (isEnglish ? 'first month' : 'no primeiro mês')}</span>
                  </span>
                  <span className="text-xs text-primary font-medium">
                    {isAnnual
                      ? (isEnglish
                        ? `From the second year, ${BASE_PRO_PRICE}€/year. Cancel anytime.`
                        : `A partir do segundo ano, ${BASE_PRO_PRICE}€/ano. Cancela quando quiseres.`)
                      : (isEnglish
                        ? `From the second month, ${BASE_PRO_PRICE}€/month. Cancel anytime.`
                        : `A partir do segundo mês, ${BASE_PRO_PRICE}€/mês. Cancela quando quiseres.`)}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-foreground">
                  {BASE_PRO_PRICE}€/{perUnit}
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
                  <Button type="button" variant="ghost" size="icon" aria-label={isEnglish ? 'Remove code' : 'Remover código'} onClick={removeProPromo}>
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
