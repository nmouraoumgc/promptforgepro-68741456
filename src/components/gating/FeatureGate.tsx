import { Lock, Crown, Zap, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePlanStore } from '@/stores/planStore';
import { useAuthStore } from '@/stores/authStore';
import { PlanType } from '@/types/plans';
import { useNavigate } from 'react-router-dom';

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
          isPremium ? 'text-primary' : 'text-muted-foreground'
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
  const navigate = useNavigate();
  
  // Pro-specific contextual messaging
  const defaultTitle = isPremium 
    ? 'Disponível no Premium' 
    : 'Funcionalidade Pro';
  
  const defaultDescription = isPremium
    ? 'Acede a packs profissionais e templates avançados'
    : 'Estás a usar o PromptForge como ferramenta profissional. O plano Pro desbloqueia controlo avançado.';

  const handleUpgrade = () => {
    if (isPremium) {
      setPlan('premium');
      navigate('/packs');
    } else {
      navigate('/pricing');
    }
  };
  
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          {isPremium ? (
            <Crown className="h-4 w-4 text-primary" />
          ) : (
            <Zap className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm">{title || defaultTitle}</span>
        </div>
        <Button 
          size="sm" 
          className="text-xs h-7"
          onClick={handleUpgrade}
        >
          {isPremium ? 'Desbloquear' : 'Ver Pro'}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${
        isPremium ? 'bg-primary/10' : 'bg-muted'
      }`}>
        {isPremium ? (
          <Crown className="h-6 w-6 text-primary" />
        ) : (
          <Zap className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <h3 className="font-semibold mb-1">{title || defaultTitle}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {description || defaultDescription}
      </p>
      <Button onClick={handleUpgrade}>
        {isPremium ? 'Desbloquear Premium' : 'Conhecer plano Pro'}
      </Button>
    </div>
  );
}

interface OptimizationLimitProps {
  promptId: string;
  onUpgrade?: () => void;
}

export function OptimizationLimitNotice({ promptId }: OptimizationLimitProps) {
  const { currentPlan, getOptimizationCount } = usePlanStore();
  const navigate = useNavigate();
  
  if (currentPlan !== 'free') return null;
  
  const count = getOptimizationCount(promptId);
  const remaining = 3 - count;
  
  if (remaining > 1) return null;
  
  const handleUpgrade = () => {
    navigate('/pricing');
  };
  
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50 border border-border text-sm">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {remaining <= 0 
            ? 'Limite de otimizações atingido' 
            : `${remaining} otimização restante para este prompt`
          }
        </span>
      </div>
      <Button 
        size="sm" 
        className="text-xs h-7"
        onClick={handleUpgrade}
      >
        Desbloquear mais
      </Button>
    </div>
  );
}

// Contextual Pro upsell for specific features
interface ProContextualUpsellProps {
  context: 'ab-testing' | 'version-history' | 'export' | 'high-usage';
}

const proContextMessages: Record<ProContextualUpsellProps['context'], { title: string; description: string }> = {
  'ab-testing': {
    title: 'Testes A/B',
    description: 'Compara variações e descobre qual prompt funciona melhor.',
  },
  'version-history': {
    title: 'Histórico de versões',
    description: 'Acede a todas as versões anteriores dos teus prompts.',
  },
  'export': {
    title: 'Exportar prompts',
    description: 'Exporta os teus prompts para usar noutras ferramentas.',
  },
  'high-usage': {
    title: 'Uso avançado detetado',
    description: 'Estás a usar o PromptForge como ferramenta profissional.',
  },
};

export function ProContextualUpsell({ context }: ProContextualUpsellProps) {
  const navigate = useNavigate();
  const message = proContextMessages[context];
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="h-12 w-12 rounded-full flex items-center justify-center mb-4 bg-muted">
        <Zap className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">{message.title}</h3>
      <p className="text-sm text-muted-foreground mb-2 max-w-sm">
        {message.description}
      </p>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        O plano Pro desbloqueia controlo avançado.
      </p>
      <Button onClick={() => navigate('/pricing')}>
        Conhecer plano Pro
      </Button>
    </div>
  );
}

// Auth Gate - requires login to use features
interface AuthGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  message?: string;
}

export function AuthGate({ children, fallback, message }: AuthGateProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  if (user) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="h-12 w-12 rounded-full flex items-center justify-center mb-4 bg-muted">
        <LogIn className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">Login necessário</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {message || 'Cria uma conta gratuita para usar esta funcionalidade.'}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate('/login')}>
          Login
        </Button>
        <Button onClick={() => navigate('/signup')}>
          Sign Up
        </Button>
      </div>
    </div>
  );
}

// Inline Auth Badge for buttons
export function AuthRequired({ className = '' }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1 text-xs font-medium text-muted-foreground ${className}`}>
          <LogIn className="h-3 w-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Requer login</p>
      </TooltipContent>
    </Tooltip>
  );
}
