import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PlanType, PLAN_LIMITS, PlanLimits } from '@/types/plans';
import { useAuthStore } from '@/stores/authStore';

interface PlanStore {
  currentPlan: PlanType;
  optimizationCounts: Record<string, number>; // promptId -> count
  
  // Actions
  setPlan: (plan: PlanType) => void;
  incrementOptimizationCount: (promptId: string) => void;
  getOptimizationCount: (promptId: string) => number;
  canOptimize: (promptId: string) => boolean;
  
  // Feature checks
  getLimits: () => PlanLimits;
  canAccess: (feature: keyof PlanLimits) => boolean;
  hasFullAccess: () => boolean;
}

// Admin limits - full access to everything
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
      
      getOptimizationCount: (promptId) => {
        return get().optimizationCounts[promptId] || 0;
      },
      
      canOptimize: (promptId) => {
        // Admins can always optimize
        if (useAuthStore.getState().isAdmin) return true;
        
        const limits = PLAN_LIMITS[get().currentPlan];
        const count = get().optimizationCounts[promptId] || 0;
        return count < limits.maxOptimizationsPerPrompt;
      },
      
      getLimits: () => {
        // Admins get full access
        if (useAuthStore.getState().isAdmin) return ADMIN_LIMITS;
        return PLAN_LIMITS[get().currentPlan];
      },
      
      canAccess: (feature) => {
        // Admins can access everything
        if (useAuthStore.getState().isAdmin) return true;
        
        const limits = PLAN_LIMITS[get().currentPlan];
        return limits[feature] as boolean;
      },
      
      hasFullAccess: () => {
        // Check if user has admin role or premium plan
        return useAuthStore.getState().isAdmin || get().currentPlan === 'premium';
      },
    }),
    {
      name: 'promptforge-plan',
    }
  )
);
