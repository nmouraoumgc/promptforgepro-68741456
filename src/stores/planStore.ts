import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PlanType, PLAN_LIMITS, PlanLimits } from '@/types/plans';

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
}

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
        const limits = PLAN_LIMITS[get().currentPlan];
        const count = get().optimizationCounts[promptId] || 0;
        return count < limits.maxOptimizationsPerPrompt;
      },
      
      getLimits: () => PLAN_LIMITS[get().currentPlan],
      
      canAccess: (feature) => {
        const limits = PLAN_LIMITS[get().currentPlan];
        return limits[feature] as boolean;
      },
    }),
    {
      name: 'promptforge-plan',
    }
  )
);
