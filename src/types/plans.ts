// Plan types and feature gating for PromptForge
//
// free     Free tier.
// pro      Pro subscription (pro_monthly, pro_monthly_trial_7d, pro_annual): all tools + all Prompt Packs.
// packs    "Prompt Packs" one-time purchase (EUR 19, price premium_one_time) since 2026-10-30:
//          premium Prompt Packs + all Learn lessons only; Free limits for everything else.
// premium  Grandfathered one-time buyers from before 2026-10-30: every feature, kept permanently.
// Pro + packs resolves to 'pro' server-side (Pro already includes the packs).

export type PlanType = 'free' | 'pro' | 'packs' | 'premium';

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
    canAccessPromptPacks: true,
    canDuplicatePrompts: true,
  },
  packs: {
    maxOptimizationsPerPrompt: 3,
    canAccessVersionHistory: false,
    canAccessABTesting: false,
    canSeeDetailedScore: false,
    canExportPrompts: false,
    canAccessPromptPacks: true,
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
  packs: { name: 'Prompt Packs', tagline: 'Packs e lições', taglineEn: 'Packs and lessons', color: 'text-primary' },
  premium: { name: 'Prompt Packs', tagline: 'Acesso completo (legado)', taglineEn: 'Full access (legacy)', color: 'text-primary' },
};
