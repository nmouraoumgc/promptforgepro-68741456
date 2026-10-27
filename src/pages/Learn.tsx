import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, GraduationCap, Lock, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsEnglish } from '@/i18n/lang';
import { Lesson, LessonSector, LessonTrack, useLearnEntitled, useLessonProgress, useLessons } from '@/data/learnDb';
import { LEVEL_LABEL, SECTOR_LABEL, TRACK_LABEL } from '@/components/learn/learnLabels';

const TRACKS: LessonTrack[] = ['fundamentos', 'setor', 'avancado'];
const SECTORS: LessonSector[] = ['marketing', 'pme', 'freelancers', 'imobiliario', 'hotelaria'];

function LessonCard({ lesson, done, locked, isEnglish }: { lesson: Lesson; done: boolean; locked: boolean; isEnglish: boolean }) {
  const lv = LEVEL_LABEL[lesson.level];
  return (
    <Link to={`/learn/${lesson.slug}`} className="block group" data-testid="lesson-card" data-slug={lesson.slug} data-locked={locked ? '1' : '0'}>
      <Card className={cn('h-full transition-all group-hover:border-primary/40', done && 'border-success/40')}>
        <CardContent className="p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {lesson.isFree ? (
              <Badge variant="secondary">{isEnglish ? 'Free' : 'Grátis'}</Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                {locked && <Lock className="h-3 w-3" />}Pro
              </Badge>
            )}
            <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{lesson.durationMin} min</span>
            <span className="text-muted-foreground">· {isEnglish ? lv.en : lv.pt}</span>
            {done && (
              <span className="ml-auto inline-flex items-center gap-1 text-success" data-testid="lesson-done">
                <CheckCircle2 className="h-4 w-4" />{isEnglish ? 'Done' : 'Concluída'}
              </span>
            )}
          </div>
          <h3 className="font-semibold leading-snug text-foreground">{lesson.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-3">{lesson.summary}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Learn() {
  const isEnglish = useIsEnglish();
  const entitled = useLearnEntitled();
  const { lessons, isLoading } = useLessons(isEnglish);
  const { done, completed, total } = useLessonProgress(lessons);
  const [track, setTrack] = useState<LessonTrack>('fundamentos');
  const [sector, setSector] = useState<LessonSector | 'all'>('all');

  const visible = useMemo(
    () => lessons.filter((l) => l.track === track && (track !== 'setor' || sector === 'all' || l.sector === sector)),
    [lessons, track, sector],
  );
  const lockedCount = entitled ? 0 : lessons.filter((l) => !l.isFree).length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <GraduationCap className="h-5 w-5" />
          <span className="text-sm font-medium">{isEnglish ? 'Learn' : 'Aprender'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {isEnglish ? 'Use AI to grow your business' : 'Usa a IA para fazer crescer o teu negócio'}
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          {isEnglish
            ? 'Short, practical lessons with before-and-after examples and a ready template to try straight away.'
            : 'Lições curtas e práticas, com exemplos de antes e depois e um template pronto a experimentar.'}
        </p>
        {total > 0 && (
          <div className="max-w-sm space-y-1" data-testid="learn-progress">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{isEnglish ? 'Your progress' : 'O teu progresso'}</span>
              <span>{isEnglish ? `${completed} of ${total} done` : `${completed} de ${total} concluídas`}</span>
            </div>
            <Progress value={(completed / total) * 100} className="h-2" />
          </div>
        )}
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist">
        {TRACKS.map((t) => (
          <Button
            key={t}
            role="tab"
            aria-selected={track === t}
            data-testid={`track-${t}`}
            variant={track === t ? 'default' : 'outline'}
            size="sm"
            className="shrink-0"
            onClick={() => { setTrack(t); setSector('all'); }}
          >
            {isEnglish ? TRACK_LABEL[t].en : TRACK_LABEL[t].pt}
            <span className="ml-1.5 text-xs opacity-70">{lessons.filter((l) => l.track === t).length}</span>
          </Button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground -mt-2">{isEnglish ? TRACK_LABEL[track].descEn : TRACK_LABEL[track].descPt}</p>

      {track === 'setor' && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {(['all', ...SECTORS] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSector(s)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs transition-colors',
                sector === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {s === 'all' ? (isEnglish ? 'All' : 'Todos') : isEnglish ? SECTOR_LABEL[s].en : SECTOR_LABEL[s].pt}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : track === 'setor' ? (
        <div className="space-y-6">
          {SECTORS.filter((s) => sector === 'all' || s === sector).map((s) => {
            const items = visible.filter((l) => l.sector === s);
            if (!items.length) return null;
            return (
              <section key={s} className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground">{isEnglish ? SECTOR_LABEL[s].en : SECTOR_LABEL[s].pt}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((l) => <LessonCard key={l.id} lesson={l} done={done.has(l.id)} locked={!l.isFree && !entitled} isEnglish={isEnglish} />)}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((l) => <LessonCard key={l.id} lesson={l} done={done.has(l.id)} locked={!l.isFree && !entitled} isEnglish={isEnglish} />)}
        </div>
      )}

      {lockedCount > 0 && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent" data-testid="learn-upsell">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {isEnglish ? `Unlock ${lockedCount} more lessons with Pro` : `Desbloqueia mais ${lockedCount} lições com o Pro`}
              </p>
              <p className="text-sm text-muted-foreground">
                {isEnglish
                  ? 'More Fundamentals, industry cases and advanced techniques, plus unlimited optimisations. 2 euros for 7 days.'
                  : 'Mais Fundamentos, casos por setor e técnicas avançadas, com otimizações ilimitadas. 2 € durante 7 dias.'}
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto"><Link to="/pricing">{isEnglish ? 'Try Pro' : 'Experimentar o Pro'}</Link></Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && lessons.length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground flex flex-col items-center gap-2">
          <BookOpen className="h-6 w-6" />{isEnglish ? 'Lessons could not be loaded. Please try again.' : 'Não foi possível carregar as lições. Tenta novamente.'}
        </CardContent></Card>
      )}
    </div>
  );
}
