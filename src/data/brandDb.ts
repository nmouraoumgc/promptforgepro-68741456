// Cofre de marca / Brand Kit. Rows live in brand_profiles (RLS: own rows only). The plan limit is
// enforced by a DB trigger (free 1, pro 3, premium/admin unlimited); the UI only mirrors it.
// The ACTIVE profile is read server-side by the AI edge functions (never sent from the client).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface BrandProfile {
  id: string; name: string; tone: string; audience: string; offering: string;
  keywords: string[]; forbidden_words: string[]; language: 'pt' | 'en'; is_active: boolean;
  created_at: string; updated_at: string;
}
export type BrandInput = Pick<BrandProfile, 'name' | 'tone' | 'audience' | 'offering' | 'keywords' | 'forbidden_words' | 'language'>;

export function useBrandLimit(): number {
  const plan = useAuthStore((s) => s.profile?.current_plan ?? 'free');
  const isAdmin = useAuthStore((s) => s.isAdmin);
  if (isAdmin || plan === 'premium') return Infinity;
  return plan === 'pro' ? 3 : 1;
}

export function useBrandProfiles() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const q = useQuery({
    queryKey: ['brand-profiles', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db.from('brand_profiles').select('*').order('created_at');
      if (error) throw error;
      return (data || []) as BrandProfile[];
    },
    staleTime: 60_000,
  });
  const profiles = q.data || [];
  return { profiles, active: profiles.find((p) => p.is_active) ?? null, isLoading: q.isLoading && !!userId, signedIn: !!userId };
}

export function useBrandMutations() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const done = () => qc.invalidateQueries({ queryKey: ['brand-profiles', userId] });
  const create = useMutation({
    mutationFn: async (input: BrandInput & { makeActive?: boolean }) => {
      const { makeActive, ...row } = input;
      const { data, error } = await db.from('brand_profiles').insert({ ...row, user_id: userId }).select('id').single();
      if (error) throw error;
      if (makeActive) { const r = await db.rpc('set_active_brand_profile', { _id: data.id }); if (r.error) throw r.error; }
      return data.id as string;
    },
    onSuccess: done,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...row }: BrandInput & { id: string }) => {
      const { error } = await db.from('brand_profiles').update(row).eq('id', id);
      if (error) throw error;
    },
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.from('brand_profiles').delete().eq('id', id); if (error) throw error; },
    onSuccess: done,
  });
  const setActive = useMutation({
    mutationFn: async (id: string | null) => { const { error } = await db.rpc('set_active_brand_profile', { _id: id }); if (error) throw error; },
    onSuccess: done,
  });
  return { create, update, remove, setActive };
}

export const isBrandLimitError = (e: unknown) => /BRAND_LIMIT_REACHED/.test(String((e as { message?: string })?.message ?? e));
