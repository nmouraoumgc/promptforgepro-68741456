// DB-backed, bilingual packs (pt-PT + EN), seeded by supabase/proposals/20261027_packs_i18n_catalogue.sql.
// Templates are NOT bundled: RLS on pack_prompts returns free previews to everyone and the full
// pack only to entitled users (pro, packs, grandfathered premium or admin).
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Pack, PackPrompt, OutcomeCategory } from '@/types/packs';
import { useAuthStore } from '@/stores/authStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const pick = (en: boolean, enVal: unknown, ptVal: unknown) =>
  (en && typeof enVal === 'string' && enVal.trim() ? enVal : ptVal) as string;

function mapPack(p: Row, prompts: Row[], en: boolean): Pack {
  const categories: Pack['categories'] = [];
  const byCat: Record<string, PackPrompt[]> = {};
  for (const r of prompts.sort((a, b) => a.sort_order - b.sort_order)) {
    const key = r.category_key || r.category || 'general';
    if (!byCat[key]) {
      byCat[key] = [];
      categories.push({ id: key, label: pick(en, r.category_en, r.category) || key, description: '', icon: 'FileText' });
    }
    byCat[key].push({
      id: r.prompt_key || r.id,
      title: pick(en, r.title_en, r.title),
      description: pick(en, r.description_en, r.description_pt) || '',
      content: pick(en, r.content_en, r.content),
      variables: (en && r.content_en ? r.variables_en : r.variables_pt) || [],
      isFreePreview: r.is_free_preview,
    });
  }
  return {
    id: p.id,
    slug: p.slug,
    name: pick(en, p.name_en, p.name),
    promise: pick(en, p.promise_en, p.promise_pt) || '',
    description: pick(en, p.description_en, p.description) || '',
    audience: pick(en, p.audience_en, p.audience_pt) || '',
    outcomeCategory: (p.outcome_category || 'content') as OutcomeCategory,
    icon: p.icon || 'Play',
    gradient: p.gradient || 'from-primary to-accent',
    isPremium: p.is_premium,
    categories,
    prompts: byCat,
    previewLimit: p.preview_limit ?? 2,
    benefits: (en && p.benefits_en?.length ? p.benefits_en : p.benefits_pt) || [],
    totalPrompts: p.total_prompts || prompts.length,
  };
}

async function fetchDbPacks(en: boolean): Promise<Pack[]> {
  const { data: packs, error } = await supabase
    .from('prompt_packs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  if (!packs?.length) return [];
  const { data: prompts, error: e2 } = await supabase
    .from('pack_prompts')
    .select('*')
    .in('pack_id', packs.map((p: Row) => p.id));
  if (e2) throw e2;
  return packs.map((p: Row) => mapPack(p, (prompts || []).filter((r: Row) => r.pack_id === p.id), en));
}

/** All active packs in the current site language. Re-fetched when the user (and so RLS) changes. */
export function usePacks(isEnglish: boolean) {
  const userId = useAuthStore((s) => s.user?.id ?? 'anon');
  const plan = useAuthStore((s) => s.profile?.current_plan ?? 'free');
  const q = useQuery({
    queryKey: ['packs', isEnglish ? 'en' : 'pt', userId, plan],
    queryFn: () => fetchDbPacks(isEnglish),
    staleTime: 5 * 60_000,
  });
  return { packs: q.data ?? [], isLoading: q.isLoading };
}
