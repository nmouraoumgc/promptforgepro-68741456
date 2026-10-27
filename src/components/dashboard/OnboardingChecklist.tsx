import { Link } from 'react-router-dom';
import { CheckCircle2, Wand2, Sparkles, GitCompare, GraduationCap, Star, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePromptStore } from '@/stores/promptStore';
import { usePlanStore } from '@/stores/planStore';
import { useIsEnglish } from '@/i18n/lang';
import { FIRST_LESSON_SLUG, useLessonProgress, useLessons } from '@/data/learnDb';
import { OnboardingStep, useOnboarding } from '@/data/onboarding';

type StepDef = { id: OnboardingStep; pt: [string, string, string]; en: [string, string, string]; icon: typeof Wand2; link: string };

const STEPS: Record<OnboardingStep, StepDef> = {
  learn: { id: 'learn', icon: GraduationCap, link: `/learn/${FIRST_LESSON_SLUG}`,
    pt: ['Faz a lição 1', 'Anatomia de um bom prompt: 5 minutos, grátis', 'Começar'],
    en: ['Take lesson 1', 'Anatomy of a good prompt: 5 minutes, free', 'Start'] },
  create: { id: 'create', icon: Wand2, link: '/builder',
    pt: ['Cria o teu primeiro prompt', 'Usa o construtor guiado para criar um prompt estruturado', 'Criar Prompt'],
    en: ['Create your first prompt', 'Use the guided builder to create a structured prompt', 'Create Prompt'] },
  optimize: { id: 'optimize', icon: Sparkles, link: '/optimizer',
    pt: ['Otimiza um prompt', 'Descobre como melhorar automaticamente os teus prompts', 'Otimizar'],
    en: ['Optimize a prompt', 'See how to improve your prompts automatically', 'Optimize'] },
  compare: { id: 'compare', icon: GitCompare, link: '/tester',
    pt: ['Compara e guarda', 'Testa duas versões lado a lado e guarda a melhor', 'Comparar'],
    en: ['Compare and save', 'Test two versions side by side and keep the best one', 'Compare'] },
  favorite: { id: 'favorite', icon: Star, link: '/library',
    pt: ['Guarda um favorito', 'Marca com estrela o prompt que mais vais usar', 'Biblioteca'],
    en: ['Save a favourite', 'Star the prompt you will use the most', 'Library'] },
};

export default function OnboardingChecklist() {
  const isEnglish = useIsEnglish();
  const { prompts } = usePromptStore();
  const canCompare = usePlanStore((s) => s.canAccess('canAccessABTesting'));
  const { lessons } = useLessons(isEnglish);
  const { done: lessonsDone } = useLessonProgress(lessons);
  const first = lessons.find((l) => l.slug === FIRST_LESSON_SLUG);

  const derived: OnboardingStep[] = [];
  if (first && lessonsDone.has(first.id)) derived.push('learn');
  if (prompts.length > 0) derived.push('create');
  if (prompts.some((p) => p.isFavorite)) derived.push('favorite');
  const { done, dismissed, dismiss, ready } = useOnboarding(derived);

  const steps = (['learn', 'create', 'optimize', canCompare ? 'compare' : 'favorite'] as OnboardingStep[]).map((id) => STEPS[id]);
  const completedCount = steps.filter((s) => done.includes(s.id)).length;
  if (!ready || dismissed || completedCount === steps.length) return null;

  return (
    <Card className="max-w-3xl mx-auto w-full border-info/30 bg-gradient-to-br from-info/5 to-transparent" data-testid="onboarding-checklist">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            {isEnglish ? `🚀 Get started in ${steps.length} simple steps` : `🚀 Começa em ${steps.length} passos simples`}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={dismiss} data-testid="onboarding-dismiss"
            aria-label={isEnglish ? 'Hide first steps' : 'Esconder primeiros passos'} title={isEnglish ? 'Hide' : 'Esconder'}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{isEnglish ? 'Progress' : 'Progresso'}</span>
            <span data-testid="onboarding-count">{completedCount}/{steps.length} {isEnglish ? 'completed' : 'concluídos'}</span>
          </div>
          <Progress value={(completedCount / steps.length) * 100} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => {
          const isComplete = done.includes(step.id);
          const Icon = step.icon;
          const [title, description, action] = isEnglish ? step.en : step.pt;
          return (
            <div key={step.id} data-testid={`onboarding-step-${step.id}`} data-done={isComplete ? '1' : '0'}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isComplete ? 'bg-success/10 border border-success/20' : 'bg-muted/50 hover:bg-muted/70'}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isComplete ? 'bg-success text-success-foreground' : 'bg-muted'}`}>
                {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-sm font-medium">{index + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isComplete ? 'line-through text-muted-foreground' : ''}`}>{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              {!isComplete && (
                <Button asChild size="sm" variant="outline" className="gap-1 shrink-0">
                  <Link to={step.link}><Icon className="h-3 w-3" /><span className="hidden sm:inline">{action}</span></Link>
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
