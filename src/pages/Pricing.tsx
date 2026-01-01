import { useState } from 'react';
import { Check, Sparkles, Zap, Lightbulb, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlanStore } from '@/stores/planStore';
import { useAuthStore } from '@/stores/authStore';
import { PlanType } from '@/types/plans';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const mainPlans = [
  {
    id: 'free' as PlanType,
    name: 'Free',
    description: 'Para explorar e testar',
    price: '0€',
    priceDetail: 'para sempre',
    features: [
      '3 otimizações por prompt',
      'Biblioteca de prompts',
      'Guided Builder básico',
      'Pré-visualização de packs',
    ],
    cta: 'Começar grátis',
  },
  {
    id: 'premium' as PlanType,
    name: 'Premium',
    description: 'Acesso completo aos Prompt Packs',
    price: '19€',
    priceDetail: '— pagamento único',
    features: [
      'Todos os Prompt Packs premium',
      'Hooks, scripts, estruturas e CTAs',
      'Templates profissionais',
      'Atualizações futuras incluídas',
    ],
    cta: 'Desbloquear acesso completo',
    highlight: true,
  },
];

const proPlan = {
  id: 'pro' as PlanType,
  name: 'Pro',
  description: 'Para quem usa o PromptForge como ferramenta diária de trabalho',
  price: '9€',
  priceDetail: '/mês',
  features: [
    'Otimizações ilimitadas',
    'Histórico de versões',
    'Testes A/B de prompts',
    'Pontuação detalhada',
    'Exportação de prompts',
  ],
  cta: 'Subscrever Pro',
};

export default function Pricing() {
  const { currentPlan, setPlan } = usePlanStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoadingPro, setIsLoadingPro] = useState(false);

  const handleSelectPlan = async (planId: PlanType) => {
    if (planId === 'premium') {
      navigate('/checkout');
    } else if (planId === 'pro') {
      if (!user) {
        toast({
          title: "Autenticação necessária",
          description: "Tens de iniciar sessão para subscrever o plano Pro.",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }
      
      setIsLoadingPro(true);
      try {
        const { data, error } = await supabase.functions.invoke("create-subscription");
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (data?.error) {
          toast({
            title: "Erro",
            description: data.message || data.error,
            variant: "destructive",
          });
          return;
        }
        
        if (data?.url) {
          window.location.href = data.url;
        }
      } catch (error) {
        console.error("Subscription error:", error);
        toast({
          title: "Erro ao criar subscrição",
          description: "Por favor tenta novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPro(false);
      }
    } else {
      setPlan(planId);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 animate-fade-in">
      {/* Hero */}
      <header className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Escolhe como queres usar o PromptForge
        </h1>
        <p className="text-muted-foreground text-lg">
          Packs prontos para resultados imediatos ou ferramentas avançadas para quem cria todos os dias.
        </p>
      </header>

      {/* Explanatory Block */}
      <div className="mb-10 max-w-2xl mx-auto">
        <div className="bg-muted/50 border border-border rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm mb-1">Como funciona</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A maioria dos criadores começa pelos <span className="font-medium text-foreground">Prompt Packs</span> — prontos a usar, com resultados rápidos.
                <br />
                Os planos são para quem usa o PromptForge como ferramenta de trabalho contínua.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Plans: Free + Premium */}
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
                    Recomendado
                  </span>
                </div>
              )}

              <CardHeader className={`text-center pb-4 ${plan.highlight ? 'pt-6' : ''}`}>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
                
                {/* Price */}
                <div className="pt-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.priceDetail}</span>
                  </div>
                  {plan.id === 'premium' && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Acesso imediato após compra.
                    </p>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col space-y-6">
                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className={`h-4 w-4 shrink-0 mt-0.5 ${
                        plan.highlight ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button 
                  className={`w-full ${plan.highlight ? 'shadow-md' : ''}`}
                  variant={plan.highlight ? 'default' : 'outline'}
                  disabled={isActive}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isActive ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Plano atual
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

      {/* Pro Section - Secondary */}
      <div className="mt-16 max-w-3xl mx-auto">
        {/* Divider with label */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Para utilizadores avançados
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Pro Card - Compact horizontal layout */}
        <Card className={`border-border ${currentPlan === 'pro' ? 'ring-2 ring-primary' : ''}`}>
          <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
            {/* Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">{proPlan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold">{proPlan.price}</span>
                  <span className="text-muted-foreground text-sm">{proPlan.priceDetail}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {proPlan.description}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
                {proPlan.features.map((feature, i) => (
                  <span key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-muted-foreground" />
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Button 
              className="shrink-0 shadow-md"
              disabled={currentPlan === 'pro' || isLoadingPro}
              onClick={() => handleSelectPlan('pro')}
            >
              {currentPlan === 'pro' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Plano atual
                </>
              ) : isLoadingPro ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A redirecionar...
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

      {/* Trust note */}
      <footer className="text-center mt-12 md:mt-16 max-w-lg mx-auto">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Dúvidas? O plano Free não expira — usa o tempo que precisares.
        </p>
      </footer>
    </div>
  );
}
