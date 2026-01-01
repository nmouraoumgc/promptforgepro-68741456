import { Check, Sparkles, Zap, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlanStore } from '@/stores/planStore';
import { PlanType } from '@/types/plans';

const plans = [
  {
    id: 'free' as PlanType,
    name: 'Gratuito',
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
    highlight: false,
  },
  {
    id: 'premium' as PlanType,
    name: 'Premium',
    description: 'Acesso completo aos Prompt Packs',
    price: '19€',
    priceDetail: 'pagamento único',
    features: [
      'Todos os Prompt Packs incluídos',
      'TikTok Viral Pack completo',
      'Templates prontos a usar',
      'Scripts e estruturas profissionais',
      'Atualizações futuras gratuitas',
    ],
    cta: 'Desbloquear acesso completo',
    highlight: true,
  },
  {
    id: 'pro' as PlanType,
    name: 'Pro',
    description: 'Para criadores avançados',
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
    highlight: false,
  },
];

export default function Pricing() {
  const { currentPlan, setPlan } = usePlanStore();
  const navigate = useNavigate();

  const handleSelectPlan = (planId: PlanType) => {
    setPlan(planId);
    if (planId === 'premium') {
      navigate('/packs');
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

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
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
                    Mais popular
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
                      Pagamento único. Acesso imediato.
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
                      {plan.id === 'pro' && <Zap className="h-4 w-4 mr-2" />}
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

      {/* Trust note */}
      <footer className="text-center mt-12 md:mt-16 max-w-lg mx-auto">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Dúvidas? O plano gratuito não expira — usa o tempo que precisares.
        </p>
      </footer>
    </div>
  );
}
