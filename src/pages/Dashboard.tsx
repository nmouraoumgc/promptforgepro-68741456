// Painel / Dashboard: checklist, 3 next actions (Create, Run from Library, Continue learning),
// a status strip (active brand, runs left today, plan), the example prompt and recent prompts.
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wand2, Play, GraduationCap, ArrowRight, Palette, Gauge, Crown, Clock, Star, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePromptStore } from '@/stores/promptStore';
import { useAuthStore } from '@/stores/authStore';
import { useIsEnglish } from '@/i18n/lang';
import { useBrandProfiles } from '@/data/brandDb';
import { useLessons, useLessonProgress, useLearnEntitled, type Lesson } from '@/data/learnDb';
import { invokeRun } from '@/components/run/RunPrompt';
import { useLibraryLoading } from '@/components/library/useLibraryLoading';
import ExamplePromptShowcase from '@/components/dashboard/ExamplePromptShowcase';
import OnboardingChecklist from '@/components/dashboard/OnboardingChecklist';
import { cn } from '@/lib/utils';

const TRACK_ORDER: Record<Lesson['track'], number> = { fundamentos: 0, setor: 1, avancado: 2 };
const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', premium: 'Prompt Packs' };

export default function Dashboard() {
  const isEnglish = useIsEnglish();
  const L = (pt: string, en: string) => (isEnglish ? en : pt);
  const user = useAuthStore((s) => s.user);
  const plan = useAuthStore((s) => s.profile?.current_plan ?? 'free');
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const prompts = usePromptStore((s) => s.prompts);
  const libraryLoading = useLibraryLoading();
  const { active: activeBrand, isLoading: brandLoading } = useBrandProfiles();
  const entitled = useLearnEntitled();
  const { lessons } = useLessons(isEnglish);
  const { done } = useLessonProgress(lessons);

  const recent = useMemo(
    () => [...prompts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3),
    [prompts],
  );
  const latest = recent[0];

  const ordered = useMemo(() => [...lessons].sort((a, b) => TRACK_ORDER[a.track] - TRACK_ORDER[b.track] || a.sortOrder - b.sortOrder), [lessons]);
  const accessible = ordered.filter((l) => l.isFree || entitled);
  const nextLesson = accessible.find((l) => !done.has(l.id));
  const lockedLeft = ordered.filter((l) => !l.isFree && !entitled && !done.has(l.id)).length;

  const usageQ = useQuery({
    queryKey: ['run-usage', user?.id],
    enabled: !!user,
    queryFn: async () => { const d = await invokeRun({ peek: true }); return typeof d?.limit === 'number' ? { used: d.used ?? 0, limit: d.limit } : null; },
  });
  const runsLeft = usageQ.data ? Math.max(0, usageQ.data.limit - usageQ.data.used) : null;

  const learnAction = nextLesson
    ? { to: `/learn/${nextLesson.slug}`, desc: nextLesson.title }
    : accessible.length && lockedLeft > 0
      ? { to: '/pricing', desc: L(`Concluíste as lições grátis. Mais ${lockedLeft} com o Pro.`, `You finished the free lessons. ${lockedLeft} more with Pro.`) }
      : { to: '/learn', desc: accessible.length ? L('Todas concluídas. Revê quando quiseres.', 'All done. Review any time.') : L('Lições curtas e práticas', 'Short, practical lessons') };

  const actions = [
    { id: 'create', to: '/create', icon: Wand2, label: L('Criar prompt', 'Create a prompt'), desc: L('Rápido, detalhado ou otimizar um teu', 'Quick, detailed, or optimise one of yours'), tone: 'bg-primary' },
    { id: 'run', to: latest ? `/library/${latest.id}?tab=run` : '/library', icon: Play, label: L('Executar da Biblioteca', 'Run from Library'),
      desc: libraryLoading && !latest ? L('A carregar…', 'Loading…') : latest ? latest.title : L('Ainda sem prompts guardados. Abre a Biblioteca.', 'No saved prompts yet. Open the Library.'), tone: 'bg-success' },
    { id: 'learn', to: learnAction.to, icon: GraduationCap, label: L('Continuar a aprender', 'Continue learning'), desc: learnAction.desc, tone: 'bg-info' },
  ];

  const planLabel = isAdmin ? 'Admin' : PLAN_LABEL[plan] ?? plan;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 animate-fade-in max-w-5xl mx-auto">
      <header className="space-y-1 pt-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{L('Olá! O que vais criar hoje?', 'Hi! What will you create today?')}</h1>
      </header>

      <OnboardingChecklist />

      {/* Status strip */}
      <div className="flex flex-wrap gap-2 text-sm" data-testid="dash-status">
        {user ? (
          <>
            <Link to="/brand" data-testid="status-brand" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 hover:border-primary/50 transition-colors max-w-full">
              <Palette className="h-3.5 w-3.5 text-primary shrink-0" />
              {brandLoading ? '…' : activeBrand
                ? <span className="truncate">{L('Marca', 'Brand')}: <span className="font-medium">{activeBrand.name}</span></span>
                : <span className="inline-flex items-center gap-1 font-medium text-primary"><Plus className="h-3 w-3" />{L('Criar marca', 'Create brand')}</span>}
            </Link>
            <span data-testid="status-runs" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5">
              <Gauge className="h-3.5 w-3.5 text-primary" />
              {runsLeft === null ? L('Execuções: …', 'Runs: …') : L(`${runsLeft} de ${usageQ.data!.limit} execuções hoje`, `${runsLeft} of ${usageQ.data!.limit} runs left today`)}
            </span>
            <Link to={plan === 'free' && !isAdmin ? '/pricing' : '/account'} data-testid="status-plan" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 hover:border-primary/50 transition-colors">
              <Crown className="h-3.5 w-3.5 text-primary" />{L('Plano', 'Plan')}: <span className="font-medium">{planLabel}</span>
              {plan === 'free' && !isAdmin && <span className="text-primary font-medium">· {L('Ver Pro', 'See Pro')}</span>}
            </Link>
          </>
        ) : (
          <Link to="/login" data-testid="status-signin" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 hover:border-primary/50">
            {L('Inicia sessão para guardar a biblioteca, a marca e executar prompts', 'Sign in to save your library and brand and run prompts')} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* 3 actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4" data-testid="dash-actions">
        {actions.map((a) => (
          <Link key={a.id} to={a.to} className="group" data-testid={`dash-action-${a.id}`}>
            <Card className="h-full border-border/60 hover:border-primary/50 hover:shadow-lg transition-all">
              <CardContent className="flex sm:flex-col items-center sm:items-start gap-4 p-4 md:p-5">
                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow', a.tone)}>
                  <a.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold flex items-center gap-1">{a.label}<ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" /></p>
                  <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`dash-action-${a.id}-desc`}>{a.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <ExamplePromptShowcase />

      {/* Recent */}
      <section className="space-y-2" data-testid="dash-recent">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" />{L('Recentes', 'Recent')}</h2>
          {recent.length > 0 && <Link to="/library" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">{L('Ver todos', 'View all')} <ArrowRight className="h-3 w-3" /></Link>}
        </div>
        {recent.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-4 text-sm text-muted-foreground" data-testid="dash-recent-empty">
            {libraryLoading ? L('A carregar…', 'Loading…') : <>{L('Os prompts que guardares aparecem aqui.', 'Prompts you save show up here.')} <Link className="text-primary font-medium" to="/create">{L('Criar o primeiro', 'Create your first')}</Link></>}
          </CardContent></Card>
        ) : (
          <Card className="border-border/60 divide-y divide-border/60">
            {recent.map((p) => (
              <Link key={p.id} to={`/library/${p.id}`} data-testid="dash-recent-item" className="flex items-center justify-between gap-3 p-3 hover:bg-muted/40 transition-colors">
                <span className="flex items-center gap-2 min-w-0">
                  {p.isFavorite && <Star className="h-3.5 w-3.5 fill-warning text-warning shrink-0" />}
                  <span className="truncate text-sm font-medium">{p.title}</span>
                </span>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(p.updatedAt).toLocaleDateString(isEnglish ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'short' })}</span>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
