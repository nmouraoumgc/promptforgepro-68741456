// Aprender / Learn: lessons live in the DB (learn_lessons + learn_lesson_content), never in the bundle.
// RLS returns every lesson's title/summary, but the body only for free lessons or entitled users
// (pro, premium or admin). Progress is per user in learn_progress (localStorage for visitors).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const db = supabase;

export type LessonTrack = 'fundamentos' | 'setor' | 'avancado';
export type LessonSector = 'marketing' | 'pme' | 'freelancers' | 'imobiliario' | 'hotelaria';
export interface LessonStep { title: string; text: string }
export interface LessonBody {
  problem: string;
  steps: LessonStep[];
  before: { prompt: string; note: string };
  after: { prompt: string; note: string };
  try: { intro: string; target: 'builder' | 'optimizer'; template: string; labels: Record<string, string[]> };
  checklist: string[];
  tips: LessonStep[];
}
export interface Lesson {
  id: string; slug: string; track: LessonTrack; sector: LessonSector | null; sortOrder: number;
  isFree: boolean; durationMin: number; level: 'basico' | 'intermedio' | 'avancado';
  title: string; summary: string;
}

const mapLesson = (r: Row, en: boolean): Lesson => ({
  id: r.id, slug: r.slug, track: r.track, sector: r.sector, sortOrder: r.sort_order, isFree: r.is_free,
  durationMin: r.duration_min, level: r.level,
  title: en ? r.title_en : r.title_pt, summary: en ? r.summary_en : r.summary_pt,
});

/** Whether the current user can open paid lessons (mirrors the RLS rule). */
export function useLearnEntitled(): boolean {
  const plan = useAuthStore((s) => s.profile?.current_plan ?? 'free');
  const isAdmin = useAuthStore((s) => s.isAdmin);
  return isAdmin || plan === 'pro' || plan === 'premium';
}

export function useLessons(isEnglish: boolean) {
  const q = useQuery({
    queryKey: ['learn-lessons'],
    queryFn: async () => {
      const { data, error } = await db.from('learn_lessons').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return (data || []) as Row[];
    },
    staleTime: 10 * 60_000,
  });
  return { lessons: (q.data || []).map((r) => mapLesson(r, isEnglish)), isLoading: q.isLoading, error: q.error };
}

/** One lesson: metadata always; body only when RLS allows it (null = locked). */
export function useLesson(slug: string | undefined, isEnglish: boolean) {
  const userId = useAuthStore((s) => s.user?.id ?? 'anon');
  const plan = useAuthStore((s) => s.profile?.current_plan ?? 'free');
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const q = useQuery({
    queryKey: ['learn-lesson', slug, userId, plan, isAdmin],
    enabled: !!slug,
    queryFn: async () => {
      const { data: l, error } = await db.from('learn_lessons').select('*').eq('slug', slug).eq('is_active', true).maybeSingle();
      if (error) throw error;
      if (!l) return null;
      const { data: c, error: e2 } = await db.from('learn_lesson_content').select('body_pt, body_en').eq('lesson_id', l.id).maybeSingle();
      if (e2) throw e2;
      return { row: l as Row, content: c as Row | null };
    },
    staleTime: 5 * 60_000,
  });
  const d = q.data;
  return {
    lesson: d ? mapLesson(d.row, isEnglish) : null,
    body: d?.content ? ((isEnglish ? d.content.body_en : d.content.body_pt) as LessonBody) : null,
    isLoading: q.isLoading,
    notFound: q.isSuccess && !d,
  };
}

const LOCAL_KEY = 'pf_learn_done_v1';
const readLocal = (): string[] => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; } };

/** First Fundamentos lesson; completing it ticks the dashboard onboarding step. */
export const FIRST_LESSON_SLUG = 'anatomia-prompt';
function tickOnboarding(slug: string) {
  if (slug !== FIRST_LESSON_SLUG) return;
  try {
    const cur: string[] = JSON.parse(localStorage.getItem('onboarding-completed') || '[]');
    if (!cur.includes('learn')) localStorage.setItem('onboarding-completed', JSON.stringify([...cur, 'learn']));
  } catch { /* ignore */ }
}

/** Completed lesson ids (DB for signed-in users, localStorage for visitors) + toggle. */
export function useLessonProgress(lessons: Lesson[]) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const q = useQuery({
    queryKey: ['learn-progress', userId],
    queryFn: async () => {
      if (!userId) return readLocal();
      const { data, error } = await db.from('learn_progress').select('lesson_id');
      if (error) throw error;
      return (data || []).map((r: Row) => r.lesson_id as string);
    },
  });
  const done = new Set<string>(q.data || []);
  const toggle = useMutation({
    mutationFn: async (lesson: Lesson) => {
      const isDone = done.has(lesson.id);
      if (!userId) {
        const cur = readLocal();
        localStorage.setItem(LOCAL_KEY, JSON.stringify(isDone ? cur.filter((x) => x !== lesson.id) : [...cur, lesson.id]));
      } else if (isDone) {
        const { error } = await db.from('learn_progress').delete().eq('lesson_id', lesson.id).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await db.from('learn_progress').upsert({ user_id: userId, lesson_id: lesson.id }, { onConflict: 'user_id,lesson_id', ignoreDuplicates: true });
        if (error) throw error;
      }
      if (!isDone) tickOnboarding(lesson.slug);
      return !isDone;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['learn-progress', userId] }),
  });
  const total = lessons.length;
  const completed = lessons.filter((l) => done.has(l.id)).length;
  return { done, completed, total, toggle: (l: Lesson) => toggle.mutateAsync(l), isSaving: toggle.isPending };
}
