import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

// One-time cleanup of legacy persisted promo cache (could contain stale codes).
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('promo-codes-storage');
  }
} catch {
  // ignore storage access errors
}

export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed' | 'free_days';
  discount_value: number;
  duration_months: number;
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

export const usePromoStore = create<PromoState>()((set) => ({
  promoCodes: [],
  isLoading: false,
  fetchPromoCodes: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Reset to empty so validation cannot match against a stale snapshot.
      set({ promoCodes: [], isLoading: false });
      throw new Error(error.message);
    }

    set({ promoCodes: (data ?? []) as PromoCode[], isLoading: false });
  },
  createPromoCode: async (data) => {
    const { error } = await supabase
      .from('promo_codes')
      .insert([{
        ...data,
        current_uses: 0,
      }]);

    if (error) throw new Error(error.message);
    await usePromoStore.getState().fetchPromoCodes();
  },
  updatePromoCode: async (id, data) => {
    const { error } = await supabase
      .from('promo_codes')
      .update(data)
      .eq('id', id);
    if (error) throw new Error(error.message);
    await usePromoStore.getState().fetchPromoCodes();
  },
  deletePromoCode: async (id) => {
    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    await usePromoStore.getState().fetchPromoCodes();
  },
}));
