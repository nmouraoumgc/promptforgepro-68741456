import { Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePlanStore } from '@/stores/planStore';
import { PlanType } from '@/types/plans';

interface FeatureGateProps {
  feature: 'pro' | 'premium';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  inline?: boolean;
}

export function FeatureGate({ feature, children, fallback, inline = false }: FeatureGateProps) {
  const { currentPlan } = usePlanStore();
  
  const hasAccess = feature === 'pro' 
    ? currentPlan === 'pro' || currentPlan === 'premium'
    : currentPlan === 'premium';
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (inline) {
    return <ProBadge feature={feature} />;
  }
  
  return null;
}

interface ProBadgeProps {
  feature: 'pro' | 'premium';
  className?: string;
}

export function ProBadge({ feature, className = '' }: ProBadgeProps) {
  const isPremium = feature === 'premium';
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
          isPremium ? 'text-primary' : 'text-info'
        } ${className}`}>
          {isPremium ? <Crown className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {isPremium ? 'Premium' : 'Pro'}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Funcionalidade {isPremium ? 'Premium' : 'Pro'}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface UpgradePromptProps {
  feature: 'pro' | 'premium';
  title?: string;
  description?: string;
  compact?: boolean;
}

export function UpgradePrompt({ 
  feature, 
  title, 
  description,
  compact = false 
}: UpgradePromptProps) {
  const isPremium = feature === 'premium';
  const { setPlan } = usePlanStore();
  
  const defaultTitle = isPremium 
    ? 'Disponível no Premium' 
    : 'Disponível no Pro';
  
  const defaultDescription = isPremium
    ? 'Acede a packs profissionais e templates avançados'
    : 'Desbloqueia funcionalidades profissionais completas';
  
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          {isPremium ? (
            <Crown className="h-4 w-4 text-primary" />
          ) : (
            <Lock className="h-4 w-4 text-info" />
          )}
          <span className="text-sm">{title || defaultTitle}</span>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="text-xs h-7"
          onClick={() => setPlan(feature)}
        >
          Upgrade
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${
        isPremium ? 'bg-primary/10' : 'bg-info/10'
      }`}>
        {isPremium ? (
          <Crown className="h-6 w-6 text-primary" />
        ) : (
          <Lock className="h-6 w-6 text-info" />
        )}
      </div>
      <h3 className="font-semibold mb-1">{title || defaultTitle}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {description || defaultDescription}
      </p>
      <Button onClick={() => setPlan(feature)}>
        Upgrade para {isPremium ? 'Premium' : 'Pro'}
      </Button>
    </div>
  );
}

interface OptimizationLimitProps {
  promptId: string;
  onUpgrade?: () => void;
}

export function OptimizationLimitNotice({ promptId }: OptimizationLimitProps) {
  const { currentPlan, getOptimizationCount, setPlan } = usePlanStore();
  
  if (currentPlan !== 'free') return null;
  
  const count = getOptimizationCount(promptId);
  const remaining = 3 - count;
  
  if (remaining > 1) return null;
  
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
      <span className="text-muted-foreground">
        {remaining <= 0 
          ? 'Limite de otimizações atingido' 
          : `${remaining} otimização restante para este prompt`
        }
      </span>
      <Button 
        size="sm" 
        variant="outline" 
        className="text-xs h-7 border-warning/30 hover:bg-warning/10"
        onClick={() => setPlan('pro')}
      >
        Upgrade para continuar
      </Button>
    </div>
  );
}
