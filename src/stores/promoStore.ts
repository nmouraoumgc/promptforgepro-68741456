import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

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

// Use type assertion since promo_codes table is not yet in generated types
const fromPromo = () => supabase.from('promo_codes' as any);

export const usePromoStore = create<PromoState>()(
  persist(
    (set) => ({
      promoCodes: [],
      isLoading: false,
      fetchPromoCodes: async () => {
        set({ isLoading: true });
        const { data, error } = await supabase
          .from('promo_codes')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          set({ promoCodes: data as PromoCode[] });
        }
        set({ isLoading: false });
      },
      createPromoCode: async (data) => {
        const { error } = await supabase
          .from('promo_codes')
          .insert([{
            ...data,
            current_uses: 0,
          }]);

        if (error) throw error;
        await (usePromoStore.getState().fetchPromoCodes());
      },
      updatePromoCode: async (id, data) => {
        const { error } = await supabase
          .from('promo_codes')
          .update(data)
          .eq('id', id);
        if (error) throw error;
        await (usePromoStore.getState().fetchPromoCodes());
      },
      deletePromoCode: async (id) => {
        const { error } = await supabase
          .from('promo_codes')
          .delete()
          .eq('id', id);
        if (error) throw error;
        await (usePromoStore.getState().fetchPromoCodes());
      },
    }),
    { name: 'promo-codes-storage' }
  )
);
