import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, X, Crown, Zap, Sparkles, Settings, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { usePlanStore } from '@/stores/planStore';
import { PlanType, PLAN_LIMITS, PLAN_INFO } from '@/types/plans';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { localizeApiError } from '@/i18n/lang';

export default function Plans() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const { currentPlan: localPlan } = usePlanStore();
  const { toast } = useToast();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [hasPaddleSubscription, setHasPaddleSubscription] = useState(false);

  const currentPlan = profile?.current_plan || localPlan;

  // Detect any subscription row (active, past_due or canceled-in-grace-period)
  // so we can offer the customer portal even after a cancellation.
  useEffect(() => {
    if (!user) { setHasPaddleSubscription(false); return; }
    supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setHasPaddleSubscription(!!data));
  }, [user]);


  const planFeatures = [
    { key: 'maxOptimizationsPerPrompt', label: t('plans.features.optimizations'), format: (v: number) => v === Infinity ? t('plans.features.unlimited') : `${v}` },
    { key: 'canAccessVersionHistory', label: t('plans.features.versionHistory') },
    { key: 'canAccessABTesting', label: t('plans.features.abTesting') },
    { key: 'canSeeDetailedScore', label: t('plans.features.detailedScore') },
    { key: 'canExportPrompts', label: t('plans.features.exportPrompts') },
    { key: 'canAccessPromptPacks', label: t('plans.features.premiumPacks') },
  ];

  const planDetails: Record<PlanType, { price: string; period: string; description: string }> = {
    free: { price: '0€', period: t('plans.details.freePeriod'), description: t('plans.details.freeDesc') },
    pro: { price: '9€', period: t('plans.details.proPeriod'), description: t('plans.details.proDesc') },
    packs: { price: '19€', period: t('plans.details.packsPeriod'), description: t('plans.details.packsDesc') },
    premium: { price: '19€', period: t('plans.details.premiumPeriod'), description: t('plans.details.premiumDesc') },
  };

  const getPlanIcon = (plan: PlanType) => {
    switch (plan) {
      case 'premium':
      case 'packs': return <Sparkles className="h-5 w-5" />;
      case 'pro': return <Zap className="h-5 w-5" />;
      default: return <Crown className="h-5 w-5" />;
    }
  };

  const handleManageSubscription = async () => {
    if (!user) {
      toast({ title: t('plans.authNeeded'), description: t('plans.authNeededDesc'), variant: "destructive" });
      return;
    }
    setIsLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw new Error(error.message);
      if (data?.error) {
        toast({ title: t('common.error'), description: localizeApiError(data.error, (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en')), variant: "destructive" });
        return;
      }
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      console.error("Portal error:", error);
      toast({ title: t('plans.portalError'), description: t('plans.portalErrorDesc'), variant: "destructive" });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  // Grandfathered Premium holders see their legacy plan; everyone else sees the Prompt Packs product.
  const plans: PlanType[] = currentPlan === 'premium' ? ['free', 'pro', 'premium'] : ['free', 'pro', 'packs'];

  return (
    <div className="p-6 md:p-8 lg:p-10 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <header className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">{t('plans.title')}</h1>
            <p className="text-muted-foreground">{t('plans.subtitle')}</p>
          </header>

          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    currentPlan === 'premium' || currentPlan === 'packs' ? 'bg-primary/20 text-primary' :
                    currentPlan === 'pro' ? 'bg-info/20 text-info' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {getPlanIcon(currentPlan)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('plans.currentPlan')}</p>
                    <p className="font-semibold">{PLAN_INFO[currentPlan].name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {hasPaddleSubscription && (
                    <Button variant="outline" onClick={handleManageSubscription} disabled={isLoadingPortal}>
                      {isLoadingPortal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
                      {t('plans.manageSubscription')}
                    </Button>
                  )}
                  {(currentPlan === 'free' || currentPlan === 'packs') && !hasPaddleSubscription && (
                    <Button onClick={() => navigate('/pricing')}>{t('plans.upgrade')}</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan === plan;
              const limits = PLAN_LIMITS[plan];
              const details = planDetails[plan];
              const info = PLAN_INFO[plan];

              return (
                <Card key={plan} className={`relative ${isCurrentPlan ? 'border-primary shadow-md' : ''}`}>
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge>{t('plans.currentPlan')}</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-3 ${
                      plan === 'premium' || plan === 'packs' ? 'bg-primary/10 text-primary' :
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
                          {hasFeature ? <Check className="h-4 w-4 text-primary flex-shrink-0" /> : <X className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />}
                          <span className={!hasFeature ? 'text-muted-foreground/50' : ''}>
                            {feature.format ? feature.format(value as number) : feature.label}
                            {!feature.format && `: ${feature.label}`}
                          </span>
                        </div>
                      );
                    })}
                    {!isCurrentPlan && plan !== 'free' && plan !== 'premium' && !(plan === 'packs' && (currentPlan === 'pro' || currentPlan === 'premium')) && (
                      <Button className="w-full mt-4" variant={plan === 'packs' ? 'default' : 'outline'} onClick={() => navigate(plan === 'packs' ? '/checkout' : '/pricing')}>
                        {plan === 'packs' ? t('plans.unlock') : t('plans.viewDetails')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">{t('plans.footer')}</p>
        </motion.div>
      </div>
    </div>
  );
}
