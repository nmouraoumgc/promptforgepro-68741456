import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { User, Mail, CreditCard, LogOut, Crown, Zap, Sparkles, ReceiptText, Loader2 } from 'lucide-react';
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
  const { toast } = useToast();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

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
      case 'premium': return <Sparkles className="h-5 w-5" />;
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('account.profile')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('account.email')}</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
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
                      currentPlan === 'premium' ? 'bg-primary/10 text-primary' :
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
                        {currentPlan === 'premium' && t('account.premiumDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => navigate('/planos')}>
                    {t('account.viewPlans')}
                  </Button>
                  {currentPlan !== 'premium' && (
                    <Button onClick={() => navigate('/checkout')}>
                      {t('account.upgrade')}
                    </Button>
                  )}
                </div>
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
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
