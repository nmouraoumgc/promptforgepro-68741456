import { Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlanStore } from '@/stores/planStore';
import { PlanType } from '@/types/plans';

const plans = [
  {
    id: 'free' as PlanType,
    name: 'Free',
    label: 'Explorar',
    description: 'Para descobrir o poder de prompts bem construídos.',
    price: '0€',
    features: [
      'Criar prompts',
      'Otimizações limitadas',
      'Biblioteca básica',
      'Prompt Score simples',
    ],
    cta: 'Começar grátis',
    highlight: false,
  },
  {
    id: 'pro' as PlanType,
    name: 'Pro',
    label: 'Profissional',
    description: 'Para quem usa prompts como ferramenta de trabalho.',
    price: '9€',
    period: '/mês',
    features: [
      'Otimizações ilimitadas',
      'Histórico de versões',
      'Testes A/B',
      'Prompt Score avançado',
      'Exportar prompts',
    ],
    cta: 'Upgrade para Pro',
    highlight: true,
  },
  {
    id: 'premium' as PlanType,
    name: 'Premium',
    label: 'Acelerar',
    description: 'Para quem quer resultados mais rápidos.',
    price: '19€',
    period: '/mês',
    features: [
      'Tudo do Pro',
      'Prompt Packs premium',
      'Templates profissionais',
      'Casos de uso avançados',
      'Atualizações exclusivas',
    ],
    cta: 'Desbloquear Premium',
    highlight: false,
  },
];

export default function Pricing() {
  const { currentPlan, setPlan } = usePlanStore();

  const handleSelectPlan = (planId: PlanType) => {
    setPlan(planId);
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 animate-fade-in">
      {/* Hero */}
      <header className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Escolhe como queres trabalhar com prompts
        </h1>
        <p className="text-muted-foreground text-lg">
          Começa grátis. Evolui quando fizer sentido.
        </p>
      </header>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const isActive = currentPlan === plan.id;
          
          return (
            <Card 
              key={plan.id}
              className={`relative transition-all ${
                plan.highlight 
                  ? 'border-primary/50 shadow-lg shadow-primary/10' 
                  : 'border-border'
              } ${isActive ? 'ring-2 ring-primary' : ''}`}
            >
              <CardHeader className="text-center pb-4">
                <div className="mb-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    plan.id === 'free' 
                      ? 'bg-muted text-muted-foreground' 
                      : plan.id === 'pro'
                      ? 'bg-info/10 text-info'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {plan.label}
                  </span>
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
                
                {/* Price */}
                <div className="pt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check className={`h-4 w-4 shrink-0 ${
                        plan.id === 'free' 
                          ? 'text-muted-foreground' 
                          : plan.id === 'pro'
                          ? 'text-info'
                          : 'text-primary'
                      }`} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button 
                  className="w-full"
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
                    plan.cta
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
          Podes usar a versão gratuita sem limite de tempo.
          <br />
          Faz upgrade apenas quando sentires necessidade.
        </p>
      </footer>
    </div>
  );
}
