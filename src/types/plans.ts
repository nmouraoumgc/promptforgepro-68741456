// Plan types and feature gating for PromptForge

export type PlanType = 'free' | 'pro' | 'premium';

export interface PlanLimits {
  maxOptimizationsPerPrompt: number;
  canAccessVersionHistory: boolean;
  canAccessABTesting: boolean;
  canSeeDetailedScore: boolean;
  canExportPrompts: boolean;
  canAccessPromptPacks: boolean;
  canDuplicatePrompts: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxOptimizationsPerPrompt: 3,
    canAccessVersionHistory: false,
    canAccessABTesting: false,
    canSeeDetailedScore: false,
    canExportPrompts: false,
    canAccessPromptPacks: false,
    canDuplicatePrompts: true,
  },
  pro: {
    maxOptimizationsPerPrompt: Infinity,
    canAccessVersionHistory: true,
    canAccessABTesting: true,
    canSeeDetailedScore: true,
    canExportPrompts: true,
    canAccessPromptPacks: false,
    canDuplicatePrompts: true,
  },
  premium: {
    maxOptimizationsPerPrompt: Infinity,
    canAccessVersionHistory: true,
    canAccessABTesting: true,
    canSeeDetailedScore: true,
    canExportPrompts: true,
    canAccessPromptPacks: true,
    canDuplicatePrompts: true,
  },
};

export const PLAN_INFO: Record<PlanType, { name: string; tagline: string; taglineEn: string; color: string }> = {
  free: { name: 'Free', tagline: 'Descoberta', taglineEn: 'Discovery', color: 'text-muted-foreground' },
  pro: { name: 'Pro', tagline: 'Profissional', taglineEn: 'Professional', color: 'text-info' },
  premium: { name: 'Prompt Packs', tagline: 'Acelerado', taglineEn: 'Accelerated', color: 'text-primary' },
};
