import { cn } from '@/lib/utils';
import { TrendingUp, Wand2, BookOpen, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link, useNavigate } from 'react-router-dom';
import { useLearnEntitled, useLessons } from '@/data/learnDb';
import { usePlanStore } from '@/stores/planStore';
import { ProBadge } from '@/components/gating/FeatureGate';
import { useIsEnglish } from '@/i18n/lang';

interface ScoreData {
  overall: number;
  clarity: number;
  context: number;
  aiRole: number;
  constraints: number;
  outputFormat: number;
  successCriteria: number;
  genericResponseRisk: number;
}

interface ActionableScoreProps {
  score: ScoreData;
  onAutoFix?: () => void;
  autoFixLabel?: string;
}

const getScoreLabel = (score: number, en: boolean): { label: string; color: string } => {
  if (score >= 90) return { label: en ? 'Excellent' : 'Excelente', color: 'text-success' };
  if (score >= 75) return { label: en ? 'Good' : 'Bom', color: 'text-info' };
  if (score >= 60) return { label: en ? 'Good, but could improve' : 'Bom, mas pode melhorar', color: 'text-warning' };
  if (score >= 40) return { label: en ? 'Needs work' : 'Precisa de trabalho', color: 'text-orange-500' };
  return { label: en ? 'Needs a lot of work' : 'Precisa de muito trabalho', color: 'text-destructive' };
};

/** Learn lesson that best addresses the weakest part of the score. */
const lessonForScore = (score: ScoreData): string => {
  const gaps: [string, number][] = [
    ['contexto-negocio', 75 - score.context],
    ['formato-certo', 75 - score.outputFormat],
    ['erros-comuns', score.genericResponseRisk - 55],
    ['anatomia-prompt', Math.max(80 - score.clarity, 75 - score.aiRole, 75 - score.constraints, 70 - score.successCriteria)],
  ];
  const [slug, gap] = gaps.sort((a, b) => b[1] - a[1])[0];
  return gap > 0 ? slug : 'iterar';
};

const getImprovementSuggestions = (score: ScoreData, en: boolean): string[] => {
  const suggestions: string[] = [];
  
  if (score.clarity < 80) {
    suggestions.push(en ? "Define the prompt's main objective more clearly" : 'Define melhor o objetivo principal do prompt');
  }
  if (score.context < 75) {
    suggestions.push(en ? 'Add more context: target audience, scenario and end goal' : 'Adiciona mais contexto: público-alvo, cenário e objetivo final');
  }
  if (score.aiRole < 75) {
    suggestions.push(en ? 'Give the AI a clear role (e.g. consultant, editor, specialist)' : 'Atribui um papel claro à IA (ex: consultor, editor, especialista)');
  }
  if (score.constraints < 75) {
    suggestions.push(en ? 'Set explicit constraints to reduce ambiguity' : 'Define restrições explícitas para reduzir ambiguidade');
  }
  if (score.outputFormat < 75) {
    suggestions.push(en ? 'Specify the expected output format (list, table, JSON, etc.)' : 'Especifica o formato de output esperado (lista, tabela, JSON, etc.)');
  }
  if (score.successCriteria < 70) {
    suggestions.push(en ? 'Include success criteria to judge the quality of the answer' : 'Inclui critérios de sucesso para avaliar a qualidade da resposta');
  }
  if (score.genericResponseRisk > 55) {
    suggestions.push(en ? 'Lower the risk of a generic answer with concrete details and examples' : 'Reduz o risco de resposta genérica com detalhes e exemplos concretos');
  }
  if (score.overall < 70) {
    suggestions.push(en ? 'Cut vague instructions such as "good" or "interesting"' : 'Reduz instruções vagas como "bom" ou "interessante"');
  }
  
  // If score is high, give positive feedback
  if (suggestions.length === 0) {
    suggestions.push(en ? 'Your prompt is well structured!' : 'O teu prompt está bem estruturado!');
    suggestions.push(en ? 'Consider testing variations to optimize it even further' : 'Considera testar variações para otimizar ainda mais');
  }
  
  return suggestions.slice(0, 4);
};

// Buttons whose label may wrap (long PT labels, A+ / A++ text sizes): grow in height instead of clipping.
const WRAP_BTN = 'h-auto min-h-10 whitespace-normal py-2 text-center leading-snug gap-2';

const scoreLabelsEn: Record<string, string> = {
  clarity: 'Clarity',
  context: 'Context',
  aiRole: 'AI role',
  constraints: 'Constraints',
  outputFormat: 'Output format',
  successCriteria: 'Success criteria',
  genericResponseRisk: 'Generic response risk',
};

const scoreLabelsPt: Record<string, string> = {
  clarity: 'Clareza',
  context: 'Contexto',
  aiRole: 'Papel da IA',
  constraints: 'Restrições',
  outputFormat: 'Formato de output',
  successCriteria: 'Critérios de sucesso',
  genericResponseRisk: 'Risco de resposta genérica',
};

export default function ActionableScore({ score, onAutoFix, autoFixLabel }: ActionableScoreProps) {
  const isEnglish = useIsEnglish();
  const scoreLabels = isEnglish ? scoreLabelsEn : scoreLabelsPt;
  const { label, color } = getScoreLabel(score.overall, isEnglish);
  const suggestions = getImprovementSuggestions(score, isEnglish);
  const needsImprovement = score.overall < 80;
  const { canAccess } = usePlanStore();
  const navigate = useNavigate();
  const entitled = useLearnEntitled();
  const { lessons } = useLessons(isEnglish);
  const lessonSlug = lessonForScore(score);
  const lessonLocked = !entitled && lessons.some((l) => l.slug === lessonSlug && !l.isFree);
  const learnLink = (className: string) => (
    <Link to={`/learn/${lessonSlug}`} data-testid="learn-improve" data-locked={lessonLocked ? '1' : '0'} className={cn('flex min-w-0', className)}>
      <Button variant="outline" className={cn(WRAP_BTN, 'w-full')}>
        <BookOpen className="h-4 w-4" />
        {isEnglish ? 'Learn how to improve' : 'Aprender a melhorar'}
        {lessonLocked && <span className="inline-flex items-center gap-0.5 rounded border border-primary/40 px-1 text-[0.625rem] font-semibold text-primary"><Lock className="h-2.5 w-2.5" />Pro</span>}
      </Button>
    </Link>
  );
  const canSeeDetails = canAccess('canSeeDetailedScore');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          {isEnglish ? 'Prompt Score' : 'Pontuação do prompt'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main score - always visible */}
        <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-bold text-primary">{score.overall}</span>
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          <p className={`text-sm font-medium mt-2 ${color}`}>
            {label}
          </p>
        </div>

        {/* Score breakdown - gated for free users */}
        {canSeeDetails ? (
          <>
            <div className="space-y-3">
              {Object.entries(score)
                .filter(([key]) => key !== 'overall')
                .map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{scoreLabels[key]}</span>
                      <span className={value < 70 ? 'text-warning' : 'text-foreground'}>
                        {key === 'genericResponseRisk' ? `${value}%` : `${value}%`}
                      </span>
                    </div>
                    <Progress value={key === 'genericResponseRisk' ? 100 - value : value} className="h-2" />
                  </div>
                ))}
            </div>

            {/* Improvement suggestions */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                {needsImprovement ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    {isEnglish ? 'To raise the score:' : 'Para aumentar o score:'}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {isEnglish ? 'Strengths:' : 'Pontos fortes:'}
                  </>
                )}
              </p>
              <ul className="space-y-2">
                {suggestions.map((suggestion, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className={needsImprovement ? 'text-warning' : 'text-success'}>
                      {needsImprovement ? '→' : '✓'}
                    </span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action buttons: side by side only when both labels fit on one line, otherwise each wraps to its own full-width row */}
            <div className="flex flex-wrap gap-2" data-testid="score-actions">
              {needsImprovement && onAutoFix && (
                <Button onClick={onAutoFix} variant="outline" className={cn(WRAP_BTN, 'flex-[1_1_auto]')} data-testid="score-autofix">
                  <Wand2 className="h-4 w-4" />
                  {autoFixLabel ?? (isEnglish ? 'Auto-fix' : 'Corrigir automaticamente')}
                </Button>
              )}
              {learnLink('flex-[1_1_auto]')}
            </div>
          </>
        ) : (
          /* Gated content for free users */
          <div className="space-y-4">
            {/* Blurred preview */}
            <div className="relative">
              <div className="space-y-3 opacity-30 blur-[2px] pointer-events-none select-none">
                {Object.entries(score)
                  .filter(([key]) => key !== 'overall')
                  .slice(0, 2)
                  .map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{scoreLabels[key]}</span>
                        <span>{value}%</span>
                      </div>
                      <Progress value={value} className="h-2" />
                    </div>
                  ))}
              </div>
            </div>

            {/* Upgrade prompt */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-info/5 border border-info/20">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-info" />
                <span className="text-sm">{isEnglish ? 'Detailed analysis' : 'Análise detalhada'}</span>
                <ProBadge feature="pro" />
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs h-7"
                onClick={() => navigate('/pricing')}
              >
                {isEnglish ? 'Unlock' : 'Desbloquear'}
              </Button>
            </div>
            {learnLink('w-full')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
