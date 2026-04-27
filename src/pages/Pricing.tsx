import { useState } from 'react';
import { Check, Sparkles, Zap, Lightbulb, Loader2, Ticket, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

  const mainPlans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Free',
      description: isEnglish ? 'To explore and test' : 'Para explorar e testar',
      price: '0€',
      priceDetail: isEnglish ? 'forever' : 'para sempre',
      features: isEnglish
        ? ['3 optimizations per prompt', 'Prompt library', 'Basic guided builder', 'Pack previews']
        : ['3 otimizações por prompt', 'Biblioteca de prompts', 'Guided Builder básico', 'Pré-visualização de packs'],
      cta: isEnglish ? 'Start free' : 'Começar grátis',
    },
    {
      id: 'premium',
      name: 'Premium',
      description: isEnglish ? 'Full access to Prompt Packs' : 'Acesso completo aos Prompt Packs',
      price: '19€',
      priceDetail: isEnglish ? '— one-time payment' : '— pagamento único',
      features: isEnglish
        ? ['All premium Prompt Packs', 'Hooks, scripts, structures and CTAs', 'Professional templates', 'Future updates included']
        : ['Todos os Prompt Packs premium', 'Hooks, scripts, estruturas e CTAs', 'Templates profissionais', 'Atualizações futuras incluídas'],
      cta: isEnglish ? 'Unlock full access' : 'Desbloquear acesso completo',
      highlight: true,
    },
  ];

  const proPlan: PricingPlan = {
    id: 'pro',
    name: 'Pro',
    description: isEnglish
      ? 'For users who rely on PromptForge every day at work'
      : 'Para quem usa o PromptForge como ferramenta diária de trabalho',
    price: '9€',
    priceDetail: isEnglish ? '/month' : '/mês',
    features: isEnglish
      ? ['Unlimited optimizations', 'Version history', 'A/B prompt testing', 'Detailed scoring', 'Prompt export']
      : ['Otimizações ilimitadas', 'Histórico de versões', 'Testes A/B de prompts', 'Pontuação detalhada', 'Exportação de prompts'],
    cta: isEnglish ? 'Subscribe to Pro' : 'Subscrever Pro',
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

    try {
      const { data: promo, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (promoError) {
        setProPromoError(
          isEnglish
            ? 'Could not verify the code. Please try again.'
            : 'Não foi possível verificar o código. Tenta novamente.'
        );
        return;
      }
      if (!promo) {
        setProPromoError(isEnglish ? 'Invalid code.' : 'Código inválido.');
        return;
      }
      if (!promo.is_active) {
        setProPromoError(isEnglish ? 'Inactive code.' : 'Código inativo.');
        return;
      }
      if (promo.max_uses > 0 && (promo.current_uses ?? 0) >= promo.max_uses) {
        setProPromoError(
          isEnglish
            ? 'This code has reached its usage limit.'
            : 'Este código atingiu o limite de utilizações.'
        );
        return;
      }
      const expiresAt = new Date(promo.expires_at);
      expiresAt.setHours(23, 59, 59, 999);
      if (expiresAt < new Date()) {
        setProPromoError(isEnglish ? 'Expired code.' : 'Código expirado.');
        return;
      }
      if (!promo.applicable_plan_types.includes('pro')) {
        setProPromoError(
          isEnglish ? 'Code not valid for this plan.' : 'Código não aplicável a este plano.'
        );
        return;
      }

      setProAppliedPromo({
        code: promo.code,
        discount_type: promo.discount_type as ProPromo['discount_type'],
        discount_value: promo.discount_value,
        duration_months: promo.duration_months ?? 0,
      });
      setProPromoError('');
    } catch {
      setProPromoError(
        isEnglish
          ? 'Could not verify the code. Please try again.'
          : 'Não foi possível verificar o código. Tenta novamente.'
      );
    }
  };

  const handleConfirmProSubscription = async () => {
    setShowProPromoDialog(false);
    setIsLoadingPro(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: isEnglish ? 'Session expired' : 'Sessão expirada',
          description: isEnglish ? 'Please sign in again.' : 'Por favor inicia sessão novamente.',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { promoCode: proAppliedPromo?.code || null },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (data?.error) {
        toast({
          title: isEnglish ? 'Subscription creation error' : 'Erro ao criar subscrição',
          description: data.message || data.error,
          variant: 'destructive',
        });
        return;
      }

      if (data?.warning) {
        toast({
          title: isEnglish ? 'Alternative checkout' : 'Checkout alternativo',
          description: isEnglish
            ? 'Redirecting to our secure external payment page.'
            : 'A redirecionar para a nossa página externa de pagamento seguro.',
        });
      }

      if (error) {
        let description = isEnglish ? 'Please try again.' : 'Por favor tenta novamente.';
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.message) description = body.message;
            else if (body?.error) description = body.error;
          }
        } catch { /* ignore parse errors */ }
        toast({
          title: isEnglish ? 'Subscription creation error' : 'Erro ao criar subscrição',
          description,
          variant: 'destructive',
        });
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: isEnglish ? 'Subscription creation error' : 'Erro ao criar subscrição',
          description: isEnglish
            ? 'Could not start checkout. Please try again.'
            : 'Não foi possível iniciar o checkout. Tenta novamente.',
          variant: 'destructive',
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
                  {plan.id === 'premium' && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {isEnglish ? 'Immediate access after purchase.' : 'Acesso imediato após compra.'}
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
            <Zap className="h-4 w-4" />
            {isEnglish ? 'For advanced users' : 'Para utilizadores avançados'}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Card className={`border-border ${currentPlan === 'pro' ? 'ring-2 ring-primary' : ''}`}>
          <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">{proPlan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold">{proPlan.price}</span>
                  <span className="text-muted-foreground text-sm">{proPlan.priceDetail}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{proPlan.description}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
                {proPlan.features.map((feature) => (
                  <span key={feature} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-muted-foreground" />
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <Button
              className="shrink-0 shadow-md"
              disabled={currentPlan === 'pro' || isLoadingPro}
              onClick={() => handleSelectPlan('pro')}
            >
              {currentPlan === 'pro' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {isEnglish ? 'Current plan' : 'Plano atual'}
                </>
              ) : isLoadingPro ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEnglish ? 'Redirecting...' : 'A redirecionar...'}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {proPlan.cta}
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
            <DialogTitle>{isEnglish ? 'Subscribe to Pro' : 'Subscrever Pro'}</DialogTitle>
            <DialogDescription>
              {isEnglish ? 'Add a promo code before proceeding to payment.' : 'Adiciona um código promocional antes de avançar para o pagamento.'}
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
                    {proFinalPrice.toFixed(2)}€/{isEnglish ? 'month' : 'mês'}
                  </span>
                  <span className="text-xs text-primary font-medium">
                    {proAppliedPromo.duration_months > 0
                      ? isEnglish
                        ? `${proAppliedPromo.discount_value}${proAppliedPromo.discount_type === 'percentage' ? '%' : '€'} discount for ${proAppliedPromo.duration_months} months, then ${BASE_PRO_PRICE}€/month`
                        : `${proAppliedPromo.discount_value}${proAppliedPromo.discount_type === 'percentage' ? '%' : '€'} de desconto durante ${proAppliedPromo.duration_months} meses, depois ${BASE_PRO_PRICE}€/mês`
                      : isEnglish
                        ? `You save ${proDiscount.toFixed(2)}€ with ${proAppliedPromo.code}`
                        : `Poupas ${proDiscount.toFixed(2)}€ com ${proAppliedPromo.code}`}
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

              {proPromoError && <p className="text-xs text-destructive">{proPromoError}</p>}
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
