import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PlanType, PLAN_LIMITS, PlanLimits } from '@/types/plans';
import { useAuthStore } from '@/stores/authStore';

interface PlanStore {
  // Optimistic local plan - only used as fallback while profile loads.
  // The DB profile.current_plan is ALWAYS the source of truth for entitlements.
  _localPlan: PlanType;
  optimizationCounts: Record<string, number>;

  // Computed (do not call directly — use `currentPlan` getter below)
  currentPlan: PlanType;

  setPlan: (plan: PlanType) => void;
  incrementOptimizationCount: (promptId: string) => void;
  getOptimizationCount: (promptId: string) => number;
  canOptimize: (promptId: string) => boolean;

  getLimits: () => PlanLimits;
  canAccess: (feature: keyof PlanLimits) => boolean;
  hasFullAccess: () => boolean;
}

const ADMIN_LIMITS: PlanLimits = {
  maxOptimizationsPerPrompt: Infinity,
  canAccessVersionHistory: true,
  canAccessABTesting: true,
  canSeeDetailedScore: true,
  canExportPrompts: true,
  canAccessPromptPacks: true,
  canDuplicatePrompts: true,
};

// Resolve the effective plan: profile (server-authoritative) wins over local cache.
function resolvePlan(localPlan: PlanType): PlanType {
  const profilePlan = useAuthStore.getState().profile?.current_plan;
  return profilePlan ?? localPlan;
}

export const usePlanStore = create<PlanStore>()(
  persist(
    (set, get) => ({
      _localPlan: 'free',
      optimizationCounts: {},

      // Getter property — recomputed on every access via Zustand selector.
      get currentPlan() {
        return resolvePlan(get()._localPlan);
      },

      // Kept for backwards compat (e.g. dev/test). In production the webhook
      // + DB trigger update profile.current_plan; the UI reads through.
      setPlan: (plan) => set({ _localPlan: plan }),

      incrementOptimizationCount: (promptId) => {
        set((state) => ({
          optimizationCounts: {
            ...state.optimizationCounts,
            [promptId]: (state.optimizationCounts[promptId] || 0) + 1,
          },
        }));
      },

      getOptimizationCount: (promptId) => get().optimizationCounts[promptId] || 0,

      canOptimize: (promptId) => {
        if (useAuthStore.getState().isAdmin) return true;
        const limits = PLAN_LIMITS[resolvePlan(get()._localPlan)];
        const count = get().optimizationCounts[promptId] || 0;
        return count < limits.maxOptimizationsPerPrompt;
      },

      getLimits: () => {
        if (useAuthStore.getState().isAdmin) return ADMIN_LIMITS;
        return PLAN_LIMITS[resolvePlan(get()._localPlan)];
      },

      canAccess: (feature) => {
        if (useAuthStore.getState().isAdmin) return true;
        const limits = PLAN_LIMITS[resolvePlan(get()._localPlan)];
        return limits[feature] as boolean;
      },

      hasFullAccess: () => {
        if (useAuthStore.getState().isAdmin) return true;
        return resolvePlan(get()._localPlan) === 'premium';
      },
    }),
    {
      name: 'promptforge-plan',
      // Only persist counters — never persist the plan itself (otherwise tampered
      // localStorage would unlock features).
      partialize: (state) => ({ optimizationCounts: state.optimizationCounts }),
    }
  )
);

// Force re-render of components subscribed to planStore whenever the profile changes.
// Without this, Zustand wouldn't know the computed `currentPlan` getter changed value.
useAuthStore.subscribe((state, prev) => {
  if (state.profile?.current_plan !== prev.profile?.current_plan ||
      state.isAdmin !== prev.isAdmin) {
    // Touch a benign field to broadcast a change to subscribers.
    usePlanStore.setState({ _localPlan: usePlanStore.getState()._localPlan });
  }
});
