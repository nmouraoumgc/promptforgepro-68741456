import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { usePlanStore } from '@/stores/planStore';

const STORAGE_KEY = 'pf_pro_trial_dialog_dismissed_v1';
const HIDDEN_PATHS = ['/login', '/signup', '/checkout', '/pricing', '/purchase-success', '/subscription-success', '/admin'];

export function ProTrialDialog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuthStore();
  const { currentPlan: localPlan, isAdmin } = usePlanStore();
  const [open, setOpen] = useState(false);

  const currentPlan = profile?.current_plan || localPlan;

  useEffect(() => {
    if (isAdmin) return;
    if (currentPlan === 'pro' || currentPlan === 'premium') return;
    if (HIDDEN_PATHS.some((p) => location.pathname.startsWith(p))) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [currentPlan, isAdmin, location.pathname]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const handleCta = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
    navigate('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0 border-primary/30">
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              {t('proTrial.badge')}
            </Badge>
          </div>
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-2xl font-bold leading-tight">
              {t('proTrial.title')}
            </DialogTitle>
            <DialogDescription className="text-base text-foreground/70">
              {t('proTrial.subtitle')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">2€</span>
              <span className="text-sm text-muted-foreground">{t('proTrial.firstMonth')}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('proTrial.thenPrice')}
            </p>
          </div>

          <ul className="space-y-2">
            {[
              t('proTrial.features.unlimited'),
              t('proTrial.features.abTesting'),
              t('proTrial.features.history'),
              t('proTrial.features.export'),
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
              onClick={handleCta}
            >
              {t('proTrial.cta')}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              {t('proTrial.dismiss')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
