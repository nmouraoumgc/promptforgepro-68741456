// "Otimizar": 1) paste the prompt and optimise, 2) choose which version to run (Detalhado,
// Criativo, the other variations or the original), 3) run it (or save it). The prompt being
// edited and its results are auto-saved per user for 24h (src/lib/draft.ts).
import { markOnboardingStep } from '@/data/onboarding';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toPlainText } from '@/lib/plainText';
import { useTranslation } from 'react-i18next';
import { Sparkles, Zap, Copy, BookmarkPlus, GitBranch, Play, Lightbulb, CheckCircle2, Circle } from 'lucide-react';
import { BrandSelector } from '@/components/brand/BrandSelector';
import { RunPrompt } from '@/components/run/RunPrompt';
import { usePromptStore } from '@/stores/promptStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { OptimizationVariant, PromptScore } from '@/types/prompt';
import { usePlanStore } from '@/stores/planStore';
import { useAuthStore } from '@/stores/authStore';
import { OptimizationLimitNotice, AuthGate } from '@/components/gating/FeatureGate';
import ActionableScore from '@/components/optimizer/ActionableScore';
import { DraftNotice } from '@/components/optimizer/DraftNotice';
import { supabase } from '@/integrations/supabase/client';
import { localizeApiError } from '@/i18n/lang';
import { clearDraft, useDraftAutosave, useInitialDraft } from '@/lib/draft';
import { cn } from '@/lib/utils';

type VariantKey = OptimizationVariant['type'] | 'original';
const MAIN: VariantKey[] = ['detailed', 'creative'];
const OTHERS: VariantKey[] = ['shorter', 'technical', 'restrictive', 'original'];

interface OptimizerDraft {
  input: string;
  base?: string;
  promptKey: string;
  optimizations: OptimizationVariant[];
  score: PromptScore | null;
  improvements: string[];
  selected: VariantKey | null;
  analysedInput: string;
  runResults: Record<string, string>;
}

interface PromptOptimizerProps {
  embedded?: boolean;
  initialPrompt?: string;
  onSaveVersion?: (content: string, label: string) => void;
  /** Called with the score of `initialPrompt` when it is optimised unchanged (library prompt page). */
  onScore?: (score: PromptScore) => void;
  /** Draft scope; one draft per screen (and per library prompt). */
  draftScope?: string;
}

export default function PromptOptimizer({ embedded = false, initialPrompt, onSaveVersion, onScore, draftScope = 'create-optimize' }: PromptOptimizerProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const addPrompt = usePromptStore((s) => s.addPrompt);
  const prefill = (location.state as { prefill?: string } | null)?.prefill;
  const { user } = useAuthStore();
  const userId = user?.id;
  // A prefill from a Learn lesson wins over an old draft; a library draft only applies to the same content.
  const rawDraft = useInitialDraft<OptimizerDraft>(userId, draftScope, !prefill);
  const draft = rawDraft && rawDraft.input && (initialPrompt === undefined || rawDraft.base === initialPrompt) ? rawDraft : null;

  const [inputPrompt, setInputPrompt] = useState(draft?.input ?? initialPrompt ?? prefill ?? '');
  // Prefill from a Learn lesson ("Experimenta já"), then clear the history state so a reload starts clean.
  useEffect(() => {
    if (prefill) navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [optimizations, setOptimizations] = useState<OptimizationVariant[]>(draft?.optimizations ?? []);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [score, setScore] = useState<PromptScore | null>(draft?.score ?? null);
  const [improvements, setImprovements] = useState<string[]>(draft?.improvements ?? []);
  const [selected, setSelected] = useState<VariantKey | null>(draft?.selected ?? null);
  const [analysedInput, setAnalysedInput] = useState(draft?.analysedInput ?? '');
  const [runResults, setRunResults] = useState<Record<string, string>>(draft?.runResults ?? {});
  const [showRestored, setShowRestored] = useState(!!draft && (draft.input !== (initialPrompt ?? '') || (draft.optimizations?.length ?? 0) > 0));
  // Per-prompt optimisation counter key (Free/Packs limit); kept in the draft so a reload does not reset it.
  const [currentPromptId, setCurrentPromptId] = useState(() => draft?.promptKey ?? `prompt-${Date.now()}`);
  const runRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
  const language = (i18n.resolvedLanguage || i18n.language || 'pt').slice(0, 2);
  const { currentPlan, canOptimize, incrementOptimizationCount } = usePlanStore();
  // Free and Prompt Packs ('packs') keep the Free per-prompt optimization limit; Pro/Premium are unlimited.
  const isLimitedPlan = currentPlan === 'free' || currentPlan === 'packs';

  const draftData = useMemo<OptimizerDraft>(() => ({
    input: inputPrompt, base: initialPrompt, promptKey: currentPromptId, optimizations, score, improvements, selected, analysedInput, runResults,
  }), [inputPrompt, initialPrompt, currentPromptId, optimizations, score, improvements, selected, analysedInput, runResults]);
  // Nothing worth keeping: empty box, or an untouched library prompt with no results.
  const draftEmpty = !inputPrompt.trim() || (initialPrompt !== undefined && inputPrompt === initialPrompt && optimizations.length === 0);
  useDraftAutosave(userId, draftScope, draftData, draftEmpty);

  const onRunResult = useCallback((key: string, r: string) => setRunResults((prev) => (prev[key] === r ? prev : { ...prev, [key]: r })), []);

  // Require authentication to use the optimizer
  if (!user) {
    return (
      <div className="p-6 animate-fade-in">
        <Card>
          <AuthGate message={isEnglish ? 'Create a free account to optimize your prompts.' : 'Cria uma conta gratuita para otimizar os teus prompts.'} />
        </Card>
      </div>
    );
  }

  const clearAll = () => {
    clearDraft(userId, draftScope);
    setInputPrompt(initialPrompt ?? '');
    setOptimizations([]); setScore(null); setImprovements([]); setSelected(null); setAnalysedInput(''); setRunResults({});
    setCurrentPromptId(`prompt-${Date.now()}`);
    setShowRestored(false);
  };

  const optimizePrompt = async () => {
    if (!inputPrompt.trim()) {
      toast({ title: isEnglish ? 'Warning' : 'Atenção', description: isEnglish ? 'Enter a prompt to optimize' : 'Introduz um prompt para otimizar', variant: 'destructive' });
      return;
    }

    // Check optimization limit for free users
    if (isLimitedPlan && !canOptimize(currentPromptId)) {
      toast({ title: isEnglish ? 'Limit reached' : 'Limite atingido', description: isEnglish ? 'Upgrade to Pro for unlimited optimizations' : 'Muda para o Pro e tem otimizações ilimitadas', variant: 'destructive' });
      return;
    }

    setIsOptimizing(true);
    setShowRestored(false);

    // Increment optimization count for free users
    if (isLimitedPlan) {
      incrementOptimizationCount(currentPromptId);
    }

    const analysed = inputPrompt;
    try {
      const { data, error } = await supabase.functions.invoke('optimize-prompt', {
        body: { prompt: analysed, language }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: isEnglish ? 'Error' : 'Erro', description: localizeApiError(data.error, isEnglish), variant: 'destructive' });
        setIsOptimizing(false);
        return;
      }
      const opts: OptimizationVariant[] = Array.isArray(data.optimizations)
        ? data.optimizations.map((o: OptimizationVariant) => ({ ...o, content: toPlainText(o.content) })).filter((o: OptimizationVariant) => o && o.type && o.content)
        : [];

      setOptimizations(opts);
      setScore(data.score || null);
      setImprovements(data.improvements || []);
      setAnalysedInput(analysed);
      setRunResults({});
      setSelected(opts.find((o) => o.type === 'detailed') ? 'detailed' : (opts[0]?.type ?? null));
      if (data.score && onScore && initialPrompt !== undefined && analysed.trim() === initialPrompt.trim()) onScore(data.score);

      markOnboardingStep('optimize');
    } catch (error) {
      console.error('Error optimizing prompt:', error);
      toast({ title: isEnglish ? 'Error' : 'Erro', description: isEnglish ? 'Could not optimize the prompt. Try again.' : 'Não foi possível otimizar o prompt. Tenta novamente.', variant: 'destructive' });
    } finally {
      setIsOptimizing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(toPlainText(text));
    toast({ title: isEnglish ? 'Copied!' : 'Copiado!', description: isEnglish ? 'Prompt copied to clipboard' : 'Prompt copiado para a área de transferência' });
  };

  const labelOf = (k: VariantKey) => t(`optimizerFlow.variants.${k}.label`);
  const contentOf = (k: VariantKey | null): string => {
    if (!k) return '';
    if (k === 'original') return analysedInput || inputPrompt;
    return optimizations.find((o) => o.type === k)?.content ?? '';
  };
  const available = (k: VariantKey) => k === 'original' ? !!(analysedInput || inputPrompt).trim() : optimizations.some((o) => o.type === k);
  const mainKeys = MAIN.filter(available);
  const otherKeys = OTHERS.filter(available);
  // Variations the API may add later still get a card.
  const extraKeys = optimizations.map((o) => o.type).filter((k) => !MAIN.includes(k) && !OTHERS.includes(k)) as VariantKey[];
  const hasResults = optimizations.length > 0;
  const selectedContent = contentOf(selected);
  const inputChanged = hasResults && inputPrompt.trim() !== analysedInput.trim();

  const choose = (k: VariantKey) => setSelected(k);

  const renderCard = (k: VariantKey, compact = false) => {
    const isSel = selected === k;
    const opt = optimizations.find((o) => o.type === k);
    const content = contentOf(k);
    const known = MAIN.includes(k) || OTHERS.includes(k);
    return (
      <div key={k} role="radio" aria-checked={isSel} tabIndex={0} data-testid={`variant-${k}`}
        onClick={() => choose(k)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(k); } }}
        className={cn('flex flex-col rounded-lg border bg-card p-3 sm:p-4 text-left cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isSel ? 'border-primary ring-2 ring-primary/25 bg-primary/5' : 'hover:border-primary/50')}>
        <div className="flex items-start gap-2">
          {isSel ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" /> : <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />}
          <div className="min-w-0 flex-1">
            <p className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>{known ? labelOf(k) : k}</p>
            {known && <p className="text-xs text-muted-foreground mt-0.5" data-testid={`variant-desc-${k}`}>{t(`optimizerFlow.variants.${k}.desc`)}</p>}
          </div>
          {isSel && <span className="text-[0.6875rem] font-medium text-primary shrink-0">{t('optimizerFlow.selected')}</span>}
        </div>
        <p className={cn('mt-3 text-sm text-muted-foreground font-mono bg-muted/50 p-2 rounded whitespace-pre-wrap break-words overflow-auto',
          compact ? 'max-h-24' : 'max-h-56')}>{content}</p>
        {!compact && opt?.changes?.length ? (
          <ul className="mt-2 space-y-0.5">
            {opt.changes.slice(0, 3).map((c, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-success">✓</span>{c}</li>)}
          </ul>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs" data-testid={`variant-copy-${k}`}
            onClick={(e) => { e.stopPropagation(); copyToClipboard(content); }}>
            <Copy className="h-3.5 w-3.5" />{t('optimizerFlow.copy')}
          </Button>
        </div>
      </div>
    );
  };

  const saveButton = selected && selectedContent ? (onSaveVersion ? (
    <Button variant="outline" className="gap-2" data-testid="optimizer-save-version" onClick={() => {
      clearDraft(userId, draftScope);
      onSaveVersion(selectedContent, labelOf(selected));
      toast({ title: isEnglish ? 'New version saved' : 'Nova versão guardada', description: isEnglish ? 'It is now the current version of this prompt.' : 'Passou a ser a versão atual deste prompt.' });
    }}><GitBranch className="h-4 w-4" />{isEnglish ? 'Save as new version' : 'Guardar como nova versão'}</Button>
  ) : (
    <Button variant="outline" className="gap-2" data-testid="optimizer-save-library" onClick={() => {
      const source = analysedInput || inputPrompt;
      const base = source.trim().split('\n')[0].slice(0, 50);
      const isOriginal = selected === 'original';
      // The score describes the analysed (original) prompt, so it is only stored with that text.
      const id = addPrompt({ title: base || (isEnglish ? 'Optimized prompt' : 'Prompt otimizado'), content: selectedContent, description: source.trim(), category: 'other', tags: isOriginal ? [] : ['optimized'], outputType: 'text', targetModel: 'generic', variables: [], isFavorite: false, ...(isOriginal && score ? { score } : {}) });
      clearDraft(userId, draftScope);
      toast({ title: isEnglish ? 'Saved!' : 'Guardado!', description: isEnglish ? 'Prompt saved to your library' : 'Prompt guardado na biblioteca' });
      navigate(`/library/${id}`);
    }}><BookmarkPlus className="h-4 w-4" />{isEnglish ? 'Save to library' : 'Guardar na biblioteca'}</Button>
  )) : null;

  return (
    <div className={embedded ? 'space-y-5' : 'p-6 space-y-5 animate-fade-in'} data-testid="optimizer">
      {showRestored && <DraftNotice onClear={clearAll} onDismiss={() => setShowRestored(false)} />}

      {/* Optimization limit notice for free users */}
      <OptimizationLimitNotice promptId={currentPromptId} />

      {/* Step 1: the prompt */}
      <Card data-testid="opt-step-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('optimizerFlow.step1Title')}</CardTitle>
          <CardDescription>{t('optimizerFlow.step1Desc')}</CardDescription>
          <BrandSelector className="pt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder={t('optimizerFlow.placeholder')}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            className="min-h-[160px]"
            data-testid="optimizer-input"
          />
          <Button onClick={optimizePrompt} disabled={isOptimizing || !inputPrompt.trim()} className="w-full sm:w-auto gap-2" size="lg" variant={hasResults && !inputChanged ? 'outline' : 'default'} data-testid="optimizer-optimize">
            {isOptimizing ? <Zap className="h-4 w-4 animate-pulse" /> : <Sparkles className="h-4 w-4" />}
            {isOptimizing ? t('optimizerFlow.optimizing') : hasResults ? t('optimizerFlow.optimizeAgain') : t('optimizerFlow.optimize')}
          </Button>
        </CardContent>
      </Card>

      {hasResults && (
        <>
          {/* Step 2: choose the version */}
          <Card data-testid="opt-step-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('optimizerFlow.step2Title')}</CardTitle>
              <CardDescription>{t('optimizerFlow.step2Desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div role="radiogroup" aria-label={t('optimizerFlow.step2Title')} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mainKeys.map((k) => renderCard(k))}
                </div>
                {(otherKeys.length > 0 || extraKeys.length > 0) && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('optimizerFlow.otherVersions')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[...otherKeys, ...extraKeys].map((k) => renderCard(k, true))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 3: run */}
          {selected && (
            <Card ref={runRef} className="border-primary/50" data-testid="optimizer-selected-actions">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><Play className="h-5 w-5 text-primary" />{t('optimizerFlow.step3Title')}</CardTitle>
                <CardDescription data-testid="optimizer-run-target">{t('optimizerFlow.step3Desc', { name: labelOf(selected) })}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <RunPrompt key={`${selected}-${selectedContent.length}`} prompt={selectedContent}
                  initialResult={runResults[selected] ?? ''} onResult={(r) => onRunResult(selected, r)} />
                {saveButton && <div className="flex flex-wrap gap-2 border-t pt-3">{saveButton}</div>}
              </CardContent>
            </Card>
          )}

          {/* Analysis of the original prompt (score + what changed) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {score && (
              <ActionableScore score={score} autoFixLabel={t('optimizerFlow.useDetailed')} onAutoFix={available('detailed') ? () => {
                setSelected('detailed');
                setTimeout(() => runRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              } : undefined} />
            )}
            {improvements.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-5 w-5 text-warning" />{t('optimizerFlow.analysisTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {improvements.map((imp, i) => (
                    <div key={i} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /><span className="text-sm">{imp}</span></div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
