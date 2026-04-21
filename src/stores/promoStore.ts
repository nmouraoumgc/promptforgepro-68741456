import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed' | 'free_days';
  discount_value: number;
  applicable_plan_types: string[];
  max_uses: number;
  current_uses?: number;
  expires_at: string;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
}

interface PromoState {
  promoCodes: PromoCode[];
  isLoading: boolean;
  fetchPromoCodes: () => Promise<void>;
  createPromoCode: (data: Omit<PromoCode, 'id'>) => Promise<void>;
  updatePromoCode: (id: string, data: Partial<PromoCode>) => Promise<void>;
  deletePromoCode: (id: string) => Promise<void>;
}

export const usePromoStore = create<PromoState>()(
  persist(
    (set, get) => ({
      promoCodes: [],
      isLoading: false,
      fetchPromoCodes: async () => {
        // no-op until backend table exists
      },
      createPromoCode: async (data) => {
        const newCode: PromoCode = {
          ...data,
          id: crypto.randomUUID(),
          current_uses: 0,
          created_at: new Date().toISOString(),
        };
        set({ promoCodes: [...get().promoCodes, newCode] });
      },
      updatePromoCode: async (id, data) => {
        set({
          promoCodes: get().promoCodes.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        });
      },
      deletePromoCode: async (id) => {
        set({ promoCodes: get().promoCodes.filter((p) => p.id !== id) });
      },
    }),
    { name: 'promo-codes-storage' }
  )
);
