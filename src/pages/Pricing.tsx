import { UsageLimits } from '@/components/UsageLimits';
import { PaymentReopeningNotice } from '@/components/payments/PaymentReopeningNotice';
import { useEffect, useState } from 'react';
import { Check, Sparkles, Zap, Lightbulb, Loader2, Ticket } from 'lucide-react';
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
import { saveCampaignCode, getCampaignCode } from '@/lib/campaignCode';
import { checkoutBlockMessage } from '@/lib/checkoutGuard';
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

const searchParamsInit = () => {
  try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(); }
};

// Pro prices (EUR). Annual = 10 x monthly (2 months free).
const PAID_CHECKOUT_ENABLED = import.meta.env.VITE_CREEM_CHECKOUT_ENABLED === 'true';
const PRO_MONTHLY_PRICE = 9;
const PRO_ANNUAL_PRICE = 90;

export default function Pricing() {
  const { currentPlan } = usePlanStore();
  const { user, isLoading: authLoading } = useAuthStore();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');

  const [isLoadingPro, setIsLoadingPro] = useState(false);
  // Pro billing interval: /pricing?billing=annual preselects the annual price (90€/year).
  const [billing, setBilling] = useState<'monthly' | 'annual'>(() =>
    (searchParamsInit().get('billing') || '').toLowerCase().startsWith('annual') ? 'annual' : 'monthly');
  const isAnnual = billing === 'annual';

  // Optional checkout discount.
  const [showProPromoDialog, setShowProPromoDialog] = useState(false);
  const [proPromoInput, setProPromoInput] = useState('');
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

  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (!PAID_CHECKOUT_ENABLED || !urlCode || autoOpened || authLoading || !user || currentPlan === 'pro' || currentPlan === 'premium') return;
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
        ? ['3 optimizations per prompt, up to 20 per day', 'Prompt library', 'Basic guided builder', 'Pack previews', '4 free Learn lessons']
        : ['3 otimizações por prompt, até 20 por dia', 'Biblioteca de prompts', 'Criador guiado básico', 'Pré-visualização de packs', '4 lições grátis do Aprender'],
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
        ? ['Everything in Prompt Packs included', 'Unlimited optimizations', 'Version history', 'A/B prompt testing', 'Detailed scoring', 'Prompt export', '100 runs per day', '3 brand profiles', 'All Learn lessons']
        : ['Tudo dos Prompt Packs incluído', 'Otimizações ilimitadas', 'Histórico de versões', 'Testes A/B de prompts', 'Pontuação detalhada', 'Exportação de prompts', '100 execuções por dia', '3 perfis de marca', 'Todas as lições do Aprender'],
      cta: isEnglish ? 'Get Pro' : 'Subscrever o Pro',
      highlight: true,
    },
  ];

  // One-time product (Paddle premium_one_time). New buyers get plan 'packs'; 'premium' = grandfathered.
  const premiumPlan: PricingPlan = {
    id: 'packs',
    name: 'Prompt Packs',
    description: isEnglish ? 'Ready-to-use prompt library. Does not include Pro tools.' : 'Biblioteca de prompts prontos a usar. Não inclui as ferramentas do Pro.',
    price: '19€',
    priceDetail: isEnglish ? 'one-time payment' : 'pagamento único',
    features: isEnglish
      ? ['All premium Prompt Packs', 'All Learn lessons', 'Future updates included']
      : ['Todos os Prompt Packs premium', 'Todas as lições do Aprender', 'Atualizações futuras incluídas'],
    cta: isEnglish ? 'Get the Prompt Packs' : 'Comprar os Prompt Packs',
  };

  const ownsPacksProduct = currentPlan === 'packs' || currentPlan === 'premium';

  const handleSelectPlan = async (planId: PlanType) => {
    if (planId !== 'free' && (planId !== 'pro' || !PAID_CHECKOUT_ENABLED)) return;
    if (planId === 'pro') {
      if (!authLoading && !user) {
        toast({
          title: isEnglish ? 'Authentication required' : 'Autenticação necessária',
          description: isEnglish ? 'You must sign in to subscribe to Pro.' : 'Tens de iniciar sessão para subscrever o plano Pro.',
          variant: 'destructive',
        });
        navigate('/login?redirect=' + encodeURIComponent('/pricing?billing=' + billing));
        return;
      }
      if (authLoading) return;
      // Show confirmation dialog (optional promo code; ?code= from a campaign link is prefilled).

      setProPromoInput(urlCode);
      setShowProPromoDialog(true);
      return;
    }

    if (!user) { navigate('/signup'); return; }
    navigate('/app');
  };

  const handleConfirmProSubscription = async () => {
    setShowProPromoDialog(false);
    setIsLoadingPro(true);

    try {
      if (!user) {
        navigate('/login?redirect=' + encodeURIComponent('/pricing?billing=' + billing));
        return;
      }

      const code = proPromoInput.trim().toUpperCase();
      const {data,error} = await supabase.functions.invoke('creem-checkout', {
        body: {billing, discountCode: code || undefined},
      });
      if (error || !data?.url) {
        toast({title:checkoutBlockMessage(data?.reason || 'checkout_unavailable',isEnglish),variant:'destructive'});
        return;
      }
      track('checkout_opened', {plan:'pro_' + billing, has_campaign_code:!!code});
      window.location.assign(data.url);
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

      <section className="max-w-5xl mx-auto mb-8 space-y-4" aria-labelledby="pricing-compare-heading">
        <div className="text-center">
          <h2 id="pricing-compare-heading" className="text-xl font-semibold">
            {isEnglish ? 'Compare plans at a glance' : 'Compara os planos num instante'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isEnglish ? 'Choose free tools, a one-time content purchase, or the complete Pro toolkit.' : 'Escolhe ferramentas gratuitas, conteúdos numa compra única ou o conjunto completo de ferramentas Pro.'}
          </p>
        </div>
        <div className="flex justify-center">{billingToggle('billing')}</div>
        <div className="overflow-x-auto rounded-xl border border-border" data-testid="pricing-comparison">
          <table className="w-full min-w-[540px] text-sm text-left">
            <caption className="sr-only">{isEnglish ? 'Free, Prompt Packs and Pro plan comparison' : 'Comparação dos planos Free, Prompt Packs e Pro'}</caption>
            <thead>
              <tr className="border-b-2 border-border">
                <th scope="col" className="bg-muted/70 px-4 py-5 text-left text-sm font-bold">{isEnglish ? 'Included' : 'Incluído'}</th>
                <th scope="col" className="bg-muted/70 px-3 py-5 text-center text-base font-bold">Free</th>
                <th scope="col" className="bg-muted/70 px-3 py-5 text-center text-base font-bold">Prompt Packs</th>
                <th scope="col" className="bg-primary/15 border-l border-primary/40 px-3 py-5 text-center text-base font-extrabold text-primary">Pro<span className="mt-1 block text-[11px] font-semibold">{isEnglish ? 'Recommended' : 'Recomendado'}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {([
                [isEnglish ? 'Price' : 'Preço', '0€', isEnglish ? '19€ once' : '19€ único', isAnnual ? (isEnglish ? '90€/year' : '90€/ano') : (isEnglish ? '9€/month' : '9€/mês')],
                [isEnglish ? 'Prompt optimizations' : 'Otimizações de prompts', isEnglish ? '3/prompt · 20/day' : '3/prompt · 20/dia', isEnglish ? '3/prompt · 20/day' : '3/prompt · 20/dia', isEnglish ? 'Unlimited' : 'Ilimitadas'],
                [isEnglish ? 'AI runs per day' : 'Execuções de IA por dia', '5', '5', '100'],
                [isEnglish ? 'Premium prompt packs' : 'Prompt Packs premium', '—', isEnglish ? 'Included' : 'Incluídos', isEnglish ? 'Included' : 'Incluídos'],
                [isEnglish ? 'Learn lessons' : 'Lições Aprender', isEnglish ? '4 free' : '4 gratuitas', isEnglish ? 'All' : 'Todas', isEnglish ? 'All' : 'Todas'],
                [isEnglish ? 'A/B tests and version history' : 'Testes A/B e histórico', '—', '—', isEnglish ? 'Included' : 'Incluídos'],
              ] as string[][]).map((cells) => (
                <tr key={cells[0]} className="bg-card">
                  <th scope="row" className="px-4 py-3 font-medium">{cells[0]}</th>
                  {cells.slice(1).map((value, index) => <td key={index} className={`px-3 py-3 text-center ${index === 2 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{value}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {isEnglish ? 'Prompt Packs add content, not Pro tool limits. Unlimited optimizations do not include unlimited AI runs.' : 'Os Prompt Packs acrescentam conteúdos, não limites Pro. Otimizações ilimitadas não incluem execuções de IA ilimitadas.'}
        </p>
        <section className="grid gap-3 sm:grid-cols-3" aria-label={isEnglish ? 'How the tools work' : 'Como funcionam as ferramentas'}>
          {[
            [isEnglish ? 'Generate' : 'Gerar', isEnglish ? 'Turn an idea into a prompt. Example: a restaurant lunch post.' : 'Transformar uma ideia num prompt. Exemplo: uma publicação sobre o almoço de um restaurante.'],
            [isEnglish ? 'Optimise' : 'Otimizar', isEnglish ? 'Evaluate and improve a prompt. Example: add the audience and tone.' : 'Avaliar e melhorar um prompt. Exemplo: acrescentar o público e o tom.'],
            [isEnglish ? 'Run' : 'Executar', isEnglish ? 'Ask AI for an answer using the prompt. Example: generate the finished caption.' : 'Pedir à IA uma resposta a partir do prompt. Exemplo: gerar a legenda final.'],
          ].map(([title, description]) => <div key={title} className="rounded-lg border border-border bg-card p-4"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>)}
        </section>
        <details className="rounded-lg border border-border bg-muted/20 p-4" data-testid="pricing-usage-details">
          <summary className="cursor-pointer font-medium text-sm">{isEnglish ? 'How do optimizations and AI runs work?' : 'Como funcionam as otimizações e execuções?'}</summary>
          <div className="mt-3"><UsageLimits /></div>
        </details>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {[mainPlans[0], premiumPlan, mainPlans[1]].map((plan) => {
          const isPacks = plan.id === 'packs';
          const isActive = !!user && (isPacks ? ownsPacksProduct : currentPlan === plan.id);
          const includedInPro = isPacks && !ownsPacksProduct && currentPlan === 'pro';
          return (
            <Card
              key={plan.id}
              data-testid={`${plan.id}-card`}
              className={`relative flex flex-col transition-all ${
                plan.highlight
                  ? 'border-primary shadow-lg shadow-primary/10 md:scale-[1.02]'
                  : 'border-border hover:border-muted-foreground/30'
              } ${isActive ? (plan.highlight ? 'ring-2 ring-primary' : 'ring-2 ring-muted-foreground/30') : ''}`}
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

              <CardContent className="flex-1 flex flex-col space-y-4">
                <p className="flex-1 text-center text-sm text-muted-foreground">
                  {plan.id === 'free'
                    ? (isEnglish ? 'Explore the essentials at no cost.' : 'Experimenta as ferramentas essenciais sem custos.')
                    : plan.id === 'packs'
                      ? (isEnglish ? 'Ready-to-use content in one purchase.' : 'Conteúdos prontos a usar numa compra única.')
                      : (isEnglish ? 'The complete toolkit for daily work.' : 'Todas as ferramentas para o trabalho diário.')}
                </p>

                <Button
                  className={`w-full ${plan.highlight ? 'shadow-md' : ''}`}
                  variant={plan.highlight ? 'default' : 'outline'}
                  disabled={isActive || includedInPro || isPacks || (plan.id === 'pro' && (!PAID_CHECKOUT_ENABLED || currentPlan === 'premium' || isLoadingPro))}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {includedInPro ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {isEnglish ? 'Included in your Pro' : 'Incluído no teu Pro'}
                    </>
                  ) : isActive ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {isEnglish ? 'Current plan' : 'Plano atual'}
                    </>
                  ) : (
                    <>
                      {plan.highlight && <Sparkles className="h-4 w-4 mr-2" />}
                      {isPacks && PAID_CHECKOUT_ENABLED ? (isEnglish ? 'Temporarily unavailable' : 'Temporariamente indisponível') : plan.cta}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!PAID_CHECKOUT_ENABLED && <div className="max-w-2xl mx-auto mt-8" data-testid="payment-reopening-notice"><PaymentReopeningNotice /></div>}
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
              <span className="text-2xl font-bold">{BASE_PRO_PRICE}€/{perUnit}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pro-promo"><Ticket className="inline h-4 w-4 mr-1" />
                {isEnglish ? 'Promo code (optional)' : 'Código promocional (opcional)'}
              </Label>
              <Input id="pro-promo" value={proPromoInput} onChange={e => setProPromoInput(e.target.value.toUpperCase())} maxLength={32} />
              <p className="text-xs text-muted-foreground">{isEnglish ? 'Review the final price in Creem before paying.' : 'Confirma o preço final na Creem antes de pagar.'}</p>
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
