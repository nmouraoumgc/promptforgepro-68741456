import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PlanType, PLAN_LIMITS, PlanLimits } from '@/types/plans';
import { useAuthStore } from '@/stores/authStore';

interface PlanStore {
  // SECURITY: This is mirrored from profiles.current_plan via the auth subscription
  // below. Do NOT rely on persisted localStorage for entitlement — the subscription
  // overwrites it on every auth/profile change. setPlan() is kept for legacy callers
  // but is overridden as soon as the profile loads.
  currentPlan: PlanType;
  optimizationCounts: Record<string, number>;

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

export const usePlanStore = create<PlanStore>()(
  persist(
    (set, get) => ({
      currentPlan: 'free',
      optimizationCounts: {},

      setPlan: (plan) => set({ currentPlan: plan }),

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
        const limits = PLAN_LIMITS[get().currentPlan];
        const count = get().optimizationCounts[promptId] || 0;
        return count < limits.maxOptimizationsPerPrompt;
      },

      getLimits: () => {
        if (useAuthStore.getState().isAdmin) return ADMIN_LIMITS;
        return PLAN_LIMITS[get().currentPlan];
      },

      canAccess: (feature) => {
        if (useAuthStore.getState().isAdmin) return true;
        const limits = PLAN_LIMITS[get().currentPlan];
        return limits[feature] as boolean;
      },

      hasFullAccess: () => {
        if (useAuthStore.getState().isAdmin) return true;
        return get().currentPlan === 'premium';
      },
    }),
    {
      name: 'promptforge-plan',
      // Only persist optimization counters; NEVER persist the plan itself
      // (so tampering localStorage cannot unlock paid features).
      partialize: (state) => ({ optimizationCounts: state.optimizationCounts }),
    }
  )
);

// SECURITY: Mirror the server-authoritative profile.current_plan into the store.
// This runs whenever auth state changes (login, signout, profile refetch, webhook
// update polled by success pages). Without this, planStore would be stuck at
// whatever was last set client-side — including unauthenticated 'free'.
let lastSyncedPlan: PlanType | null = null;
useAuthStore.subscribe((state) => {
  const serverPlan = state.profile?.current_plan ?? 'free';
  if (serverPlan !== lastSyncedPlan) {
    lastSyncedPlan = serverPlan;
    usePlanStore.setState({ currentPlan: serverPlan });
  }
});
