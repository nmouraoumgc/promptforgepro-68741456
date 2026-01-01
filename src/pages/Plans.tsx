import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, X, Crown, Zap, Sparkles, Settings, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { usePlanStore } from '@/stores/planStore';
import { PlanType, PLAN_LIMITS, PLAN_INFO } from '@/types/plans';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const planFeatures = [
  { key: 'maxOptimizationsPerPrompt', label: 'Otimizações por prompt', format: (v: number) => v === Infinity ? 'Ilimitadas' : `${v}` },
  { key: 'canAccessVersionHistory', label: 'Histórico de versões' },
  { key: 'canAccessABTesting', label: 'Testes A/B' },
  { key: 'canSeeDetailedScore', label: 'Pontuação detalhada' },
  { key: 'canExportPrompts', label: 'Exportar prompts' },
  { key: 'canAccessPromptPacks', label: 'Prompt Packs premium' },
];

const planDetails: Record<PlanType, { price: string; period: string; description: string }> = {
  free: { price: '0€', period: 'para sempre', description: 'Para explorar e testar' },
  pro: { price: '9€', period: '/mês', description: 'Para uso profissional diário' },
  premium: { price: '19€', period: 'único', description: 'Acesso completo aos Packs' },
};

export default function Plans() {
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const { currentPlan: localPlan } = usePlanStore();
  const { toast } = useToast();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  
  const currentPlan = profile?.current_plan || localPlan;

  const getPlanIcon = (plan: PlanType) => {
    switch (plan) {
      case 'premium':
        return <Sparkles className="h-5 w-5" />;
      case 'pro':
        return <Zap className="h-5 w-5" />;
      default:
        return <Crown className="h-5 w-5" />;
    }
  };

  const handleManageSubscription = async () => {
    if (!user) {
      toast({
        title: "Autenticação necessária",
        description: "Tens de iniciar sessão para gerir a subscrição.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data?.error) {
        toast({
          title: "Erro",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        title: "Erro ao abrir portal",
        description: "Por favor tenta novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const plans: PlanType[] = ['free', 'pro', 'premium'];

  return (
    <div className="p-6 md:p-8 lg:p-10 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <header className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Os teus planos</h1>
            <p className="text-muted-foreground">
              Compara as funcionalidades disponíveis em cada plano
            </p>
          </header>

          {/* Current Plan Summary */}
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    currentPlan === 'premium' ? 'bg-primary/20 text-primary' :
                    currentPlan === 'pro' ? 'bg-info/20 text-info' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {getPlanIcon(currentPlan)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plano atual</p>
                    <p className="font-semibold">{PLAN_INFO[currentPlan].name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {currentPlan === 'pro' && (
                    <Button 
                      variant="outline" 
                      onClick={handleManageSubscription}
                      disabled={isLoadingPortal}
                    >
                      {isLoadingPortal ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Settings className="h-4 w-4 mr-2" />
                      )}
                      Gerir subscrição
                    </Button>
                  )}
                  {currentPlan === 'free' && (
                    <Button onClick={() => navigate('/pricing')}>
                      Fazer upgrade
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plans Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan === plan;
              const limits = PLAN_LIMITS[plan];
              const details = planDetails[plan];
              const info = PLAN_INFO[plan];

              return (
                <Card 
                  key={plan}
                  className={`relative ${isCurrentPlan ? 'border-primary shadow-md' : ''}`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge>Plano atual</Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-4">
                    <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-3 ${
                      plan === 'premium' ? 'bg-primary/10 text-primary' :
                      plan === 'pro' ? 'bg-info/10 text-info' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {getPlanIcon(plan)}
                    </div>
                    <CardTitle>{info.name}</CardTitle>
                    <CardDescription>{details.description}</CardDescription>
                    <div className="pt-2">
                      <span className="text-3xl font-bold">{details.price}</span>
                      <span className="text-muted-foreground text-sm ml-1">{details.period}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {planFeatures.map((feature) => {
                      const value = limits[feature.key as keyof typeof limits];
                      const hasFeature = typeof value === 'boolean' ? value : true;

                      return (
                        <div key={feature.key} className="flex items-center gap-2 text-sm">
                          {hasFeature ? (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                          )}
                          <span className={!hasFeature ? 'text-muted-foreground/50' : ''}>
                            {feature.format ? feature.format(value as number) : feature.label}
                            {!feature.format && `: ${feature.label}`}
                          </span>
                        </div>
                      );
                    })}

                    {!isCurrentPlan && plan !== 'free' && (
                      <Button 
                        className="w-full mt-4" 
                        variant={plan === 'premium' ? 'default' : 'outline'}
                        onClick={() => navigate(plan === 'premium' ? '/checkout' : '/pricing')}
                      >
                        {plan === 'premium' ? 'Desbloquear' : 'Ver detalhes'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info note */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            Os upgrades são feitos através da página de checkout ou contextualmente na app.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
