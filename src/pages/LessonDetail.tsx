import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Clock, Lightbulb, Lock, Sparkles, Wand2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsEnglish } from '@/i18n/lang';
import { useAuthStore } from '@/stores/authStore';
import { usePromptStore } from '@/stores/promptStore';
import { usePageMeta } from '@/lib/pageMeta';
import { TemplateFiller, TemplateText } from '@/components/templates/TemplateFiller';
import { useLearnEntitled, useLesson, useLessonProgress, useLessons } from '@/data/learnDb';
import { LEVEL_LABEL, SECTOR_LABEL, TRACK_LABEL } from '@/components/learn/learnLabels';

export default function LessonDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEnglish = useIsEnglish();
  const user = useAuthStore((s) => s.user);
  const entitled = useLearnEntitled();
  const { lessons } = useLessons(isEnglish);
  const { lesson, body, isLoading, notFound } = useLesson(slug, isEnglish);
  const { done, toggle, isSaving } = useLessonProgress(lessons);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  usePageMeta(lesson ? { title: lesson.title, description: lesson.summary } : null, isEnglish);

  const next = useMemo(() => {
    if (!lesson) return null;
    const i = lessons.findIndex((l) => l.id === lesson.id);
    return i >= 0 ? lessons[i + 1] ?? null : null;
  }, [lessons, lesson]);

  const openIn = (target: 'builder' | 'optimizer', text: string) => {
    if (target === 'builder') {
      const st = usePromptStore.getState();
      st.resetBuilderState();
      st.updateBuilderState({
        objective: text,
        language: isEnglish ? 'en' : 'pt',
        ...(slug === 'prompts-imagens' ? { outputType: 'image' as const } : {}),
      });
      navigate('/builder');
    } else {
      navigate('/optimizer', { state: { prefill: text } });
    }
  };

  if (isLoading) {
    return <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  }
  if (notFound || !lesson) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center space-y-4">
        <p className="text-muted-foreground">{isEnglish ? 'This lesson does not exist.' : 'Esta lição não existe.'}</p>
        <Button asChild variant="outline"><Link to="/learn">{isEnglish ? 'All lessons' : 'Todas as lições'}</Link></Button>
      </div>
    );
  }

  const lv = LEVEL_LABEL[lesson.level];
  const where = lesson.sector ? (isEnglish ? SECTOR_LABEL[lesson.sector].en : SECTOR_LABEL[lesson.sector].pt) : (isEnglish ? TRACK_LABEL[lesson.track].en : TRACK_LABEL[lesson.track].pt);
  const isDone = done.has(lesson.id);
  const locked = !body;
  const labels = body?.try.labels;

  return (
    <article className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 animate-fade-in" data-testid="lesson" data-locked={locked ? '1' : '0'}>
      <Link to="/learn" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />{isEnglish ? 'All lessons' : 'Todas as lições'}
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="text-primary font-medium">{where}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.durationMin} min</span>
          <span>·</span>
          <span>{isEnglish ? lv.en : lv.pt}</span>
          {lesson.isFree ? <Badge variant="secondary">{isEnglish ? 'Free' : 'Grátis'}</Badge> : <Badge variant="outline" className="border-primary/40 text-primary">Pro</Badge>}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">{lesson.title}</h1>
        <p className="text-muted-foreground">{lesson.summary}</p>
      </header>

      {locked ? (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent" data-testid="lesson-locked">
          <CardContent className="p-5 sm:p-6 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15"><Lock className="h-6 w-6 text-primary" /></div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">{isEnglish ? 'This lesson is part of Pro' : 'Esta lição faz parte do plano Pro'}</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {isEnglish
                  ? 'Get the 3 steps, the before-and-after example, a ready template to try and the checklist. Plus every industry and advanced lesson, unlimited optimisations and A/B testing.'
                  : 'Inclui os 3 passos, o exemplo de antes e depois, um template pronto a experimentar e a checklist. E ainda todas as lições por setor e avançadas, otimizações ilimitadas e testes A/B.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button asChild data-testid="lesson-upsell"><Link to="/pricing"><Sparkles className="h-4 w-4 mr-2" />{isEnglish ? 'Try Pro for 2 euros / 7 days' : 'Experimentar o Pro por 2 € / 7 dias'}</Link></Button>
              {!user && <Button asChild variant="outline"><Link to="/login">{isEnglish ? 'I already have Pro: sign in' : 'Já tenho Pro: iniciar sessão'}</Link></Button>}
            </div>
            {!entitled && (
              <p className="text-xs text-muted-foreground">
                {isEnglish ? 'Meanwhile, the Fundamentals and the first lesson of each industry are free.' : 'Entretanto, os Fundamentos e a primeira lição de cada setor são grátis.'}{' '}
                <Link to="/learn" className="text-primary underline-offset-2 hover:underline">{isEnglish ? 'See free lessons' : 'Ver lições grátis'}</Link>
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-2" data-testid="lesson-problem">
            <h2 className="text-lg font-semibold">{isEnglish ? 'The problem' : 'O problema'}</h2>
            <p className="text-foreground/90 leading-relaxed">{body.problem}</p>
          </section>

          <section className="space-y-3" data-testid="lesson-steps">
            <h2 className="text-lg font-semibold">{isEnglish ? 'The method in 3 steps' : 'O método em 3 passos'}</h2>
            <ol className="space-y-3">
              {body.steps.map((s, i) => (
                <li key={i} className="flex gap-3 rounded-lg border border-border p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">{i + 1}</span>
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium text-foreground">{s.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed break-words">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-3" data-testid="lesson-before-after">
            <h2 className="text-lg font-semibold">{isEnglish ? 'Before and after' : 'Antes e depois'}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="border-destructive/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-destructive"><XCircle className="h-4 w-4" />{isEnglish ? 'Weak prompt' : 'Prompt fraco'}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="rounded-md bg-muted/50 p-3"><TemplateText template={body.before.prompt} isEnglish={isEnglish} labels={labels} /></div>
                  <p className="text-xs text-muted-foreground">{body.before.note}</p>
                </CardContent>
              </Card>
              <Card className="border-success/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-success"><CheckCircle2 className="h-4 w-4" />{isEnglish ? 'Strong prompt' : 'Prompt forte'}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="rounded-md bg-muted/50 p-3"><TemplateText template={body.after.prompt} isEnglish={isEnglish} labels={labels} /></div>
                  <p className="text-xs text-muted-foreground">{body.after.note}</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section data-testid="lesson-try">
            <Card className="border-primary/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" />{isEnglish ? 'Try it now' : 'Experimenta já'}</CardTitle>
                <p className="text-sm text-muted-foreground">{body.try.intro}</p>
              </CardHeader>
              <CardContent>
                <TemplateFiller
                  template={body.try.template}
                  isEnglish={isEnglish}
                  idPrefix={`lesson-${lesson.slug}`}
                  labels={labels}
                  extraActions={(text) => {
                    const primary = body.try.target;
                    const other = primary === 'builder' ? 'optimizer' : 'builder';
                    const label = (t: 'builder' | 'optimizer') =>
                      t === 'builder' ? (isEnglish ? 'Open in Create Prompt' : 'Abrir no Criar Prompt') : (isEnglish ? 'Open in Optimizer' : 'Abrir no Otimizador');
                    return (
                      <>
                        <Button size="sm" className="w-full sm:w-auto" data-testid={`open-${primary}`} onClick={() => openIn(primary, text)}>{label(primary)}</Button>
                        <Button size="sm" variant="ghost" className="w-full sm:w-auto" data-testid={`open-${other}`} onClick={() => openIn(other, text)}>{label(other)}</Button>
                      </>
                    );
                  }}
                />
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3" data-testid="lesson-checklist">
            <h2 className="text-lg font-semibold">{isEnglish ? 'Checklist' : 'Checklist'}</h2>
            <ul className="space-y-2">
              {body.checklist.map((c, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setChecked((s) => ({ ...s, [i]: !s[i] }))}
                    className="flex w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-muted/50"
                    aria-pressed={!!checked[i]}
                  >
                    {checked[i] ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />}
                    <span className={cn('text-sm', checked[i] && 'text-muted-foreground line-through')}>{c}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-3 sm:grid-cols-2" data-testid="lesson-tips">
            {body.tips.map((t, i) => (
              <Card key={i} className="bg-muted/30">
                <CardContent className="p-4 space-y-1">
                  <p className="text-sm font-medium flex items-center gap-2"><Lightbulb className="h-4 w-4 text-warning" />{t.title}</p>
                  <p className="text-sm text-muted-foreground">{t.text}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between border-t border-border pt-4">
            <Button
              variant={isDone ? 'secondary' : 'default'}
              onClick={() => toggle(lesson)}
              disabled={isSaving}
              data-testid="lesson-complete"
              data-done={isDone ? '1' : '0'}
              className="w-full sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isDone ? (isEnglish ? 'Completed' : 'Concluída') : (isEnglish ? 'Mark as completed' : 'Marcar como concluída')}
            </Button>
            {next && (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to={`/learn/${next.slug}`}>{isEnglish ? 'Next lesson' : 'Próxima lição'}<ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
            )}
          </div>
        </>
      )}
    </article>
  );
}
