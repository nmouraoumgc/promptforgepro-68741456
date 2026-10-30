import { Lock, Crown, Zap, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePlanStore } from '@/stores/planStore';
import { useAuthStore } from '@/stores/authStore';
import { PLAN_LIMITS } from '@/types/plans';
import { useNavigate } from 'react-router-dom';
import { useIsEnglish } from '@/i18n/lang';

interface FeatureGateProps {
  feature: 'pro' | 'premium';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  inline?: boolean;
}

export function FeatureGate({ feature, children, fallback, inline = false }: FeatureGateProps) {
  const { currentPlan } = usePlanStore();
  
  // 'pro' = Pro tools (Pro or grandfathered Premium). 'premium' = premium Prompt Packs
  // (Pro, Prompt Packs or grandfathered Premium).
  const hasAccess = feature === 'pro'
    ? currentPlan === 'pro' || currentPlan === 'premium'
    : currentPlan === 'pro' || currentPlan === 'packs' || currentPlan === 'premium';
  
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
  const isEnglish = useIsEnglish();
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
          isPremium ? 'text-primary' : 'text-muted-foreground'
        } ${className}`}>
          {isPremium ? <Crown className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {isPremium ? 'Prompt Packs' : 'Pro'}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isPremium ? (isEnglish ? 'Included in Prompt Packs and Pro' : 'Incluído nos Prompt Packs e no Pro') : (isEnglish ? 'Pro feature' : 'Funcionalidade Pro')}</p>
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
  const navigate = useNavigate();
  const isEnglish = useIsEnglish();
  
  // Pro-specific contextual messaging
  const defaultTitle = isPremium 
    ? (isEnglish ? 'Included in Prompt Packs and Pro' : 'Incluído nos Prompt Packs e no Pro')
    : (isEnglish ? 'Pro feature' : 'Funcionalidade Pro');
  
  const defaultDescription = isPremium
    ? (isEnglish ? 'Access professional packs and advanced templates' : 'Acede a packs profissionais e templates avançados')
    : (isEnglish ? "You're using PromptForge Pro as a professional tool. The Pro plan unlocks advanced control." : 'Estás a usar o PromptForge Pro como ferramenta profissional. O plano Pro desbloqueia controlo avançado.');

  const handleUpgrade = () => {
    if (isPremium) {
      navigate('/checkout');
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
          {isPremium ? (isEnglish ? 'Unlock' : 'Desbloquear') : (isEnglish ? 'See Pro' : 'Ver Pro')}
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
        {isPremium ? (isEnglish ? 'Unlock Prompt Packs' : 'Desbloquear Prompt Packs') : (isEnglish ? 'Discover the Pro plan' : 'Conhecer plano Pro')}
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
  const isEnglish = useIsEnglish();
  
  if (PLAN_LIMITS[currentPlan].maxOptimizationsPerPrompt === Infinity) return null;
  
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
            ? (isEnglish ? 'Optimization limit reached' : 'Limite de otimizações atingido')
            : (isEnglish ? `${remaining} optimization left for this prompt` : `${remaining} otimização restante para este prompt`)
          }
        </span>
      </div>
      <Button 
        size="sm" 
        className="text-xs h-7"
        onClick={handleUpgrade}
      >
        {isEnglish ? 'Unlock more' : 'Desbloquear mais'}
      </Button>
    </div>
  );
}

// Contextual upsell for Pro tools (A/B, version history, export): directs to Pro
interface ContextualUpsellProps {
  context: 'ab-testing' | 'version-history' | 'export' | 'high-usage';
}

const contextMessagesEn: Record<ContextualUpsellProps['context'], { title: string; description: string }> = {
  'ab-testing': { title: 'A/B tests', description: 'Compare variations and find out which prompt works best.' },
  'version-history': { title: 'Version history', description: 'Access every previous version of your prompts.' },
  'export': { title: 'Export prompts', description: 'Export your prompts to use in other tools.' },
  'high-usage': { title: 'Advanced usage detected', description: "You're using PromptForge Pro as a professional tool." },
};

const contextMessages: Record<ContextualUpsellProps['context'], { title: string; description: string }> = {
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
    description: 'Estás a usar o PromptForge Pro como ferramenta profissional.',
  },
};

export function ProContextualUpsell({ context }: ContextualUpsellProps) {
  const navigate = useNavigate();
  const isEnglish = useIsEnglish();
  const message = (isEnglish ? contextMessagesEn : contextMessages)[context];
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="h-12 w-12 rounded-full flex items-center justify-center mb-4 bg-primary/10">
        <Crown className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-semibold mb-1">{message.title}</h3>
      <p className="text-sm text-muted-foreground mb-2 max-w-sm">
        {message.description}
      </p>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {isEnglish ? 'This feature is included in the Pro plan.' : 'Esta funcionalidade está incluída no plano Pro.'}
      </p>
      <Button onClick={() => navigate('/pricing')}>
        {isEnglish ? 'See Pro plan' : 'Ver plano Pro'}
      </Button>
    </div>
  );
}

// Auth Gate - requires login to use features
interface AuthGateProps {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  message?: string;
}

export function AuthGate({ children, fallback, message }: AuthGateProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isEnglish = useIsEnglish();
  
  if (user && children) {
    return <>{children}</>;
  }
  
  if (user && !children) {
    return null;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="h-12 w-12 rounded-full flex items-center justify-center mb-4 bg-muted">
        <LogIn className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">{isEnglish ? 'Sign-in required' : 'Inicia sessão para continuar'}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {message || (isEnglish ? 'Create a free account to use this feature.' : 'Cria uma conta gratuita para usar esta funcionalidade.')}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate('/login')}>
          {isEnglish ? 'Sign in' : 'Entrar'}
        </Button>
        <Button onClick={() => navigate('/signup')}>
          {isEnglish ? 'Sign up' : 'Criar conta'}
        </Button>
      </div>
    </div>
  );
}

// Inline Auth Badge for buttons
export function AuthRequired({ className = '' }: { className?: string }) {
  const isEnglish = useIsEnglish();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1 text-xs font-medium text-muted-foreground ${className}`}>
          <LogIn className="h-3 w-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isEnglish ? 'Requires sign-in' : 'Requer login'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
