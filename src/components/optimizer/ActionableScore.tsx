import { TrendingUp, Wand2, BookOpen, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { usePlanStore } from '@/stores/planStore';
import { ProBadge } from '@/components/gating/FeatureGate';

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
}

const getScoreLabel = (score: number): { label: string; color: string } => {
  if (score >= 90) return { label: 'Excelente', color: 'text-success' };
  if (score >= 75) return { label: 'Bom', color: 'text-info' };
  if (score >= 60) return { label: 'Bom, mas pode melhorar', color: 'text-warning' };
  if (score >= 40) return { label: 'Precisa de trabalho', color: 'text-orange-500' };
  return { label: 'Precisa de muito trabalho', color: 'text-destructive' };
};

const getImprovementSuggestions = (score: ScoreData): string[] => {
  const suggestions: string[] = [];
  
  if (score.clarity < 80) {
    suggestions.push('Define melhor o objetivo principal do prompt');
  }
  if (score.context < 75) {
    suggestions.push('Adiciona mais contexto: público-alvo, cenário e objetivo final');
  }
  if (score.aiRole < 75) {
    suggestions.push('Atribui um papel claro à IA (ex: consultor, editor, especialista)');
  }
  if (score.constraints < 75) {
    suggestions.push('Define restrições explícitas para reduzir ambiguidade');
  }
  if (score.outputFormat < 75) {
    suggestions.push('Especifica o formato de output esperado (lista, tabela, JSON, etc.)');
  }
  if (score.successCriteria < 70) {
    suggestions.push('Inclui critérios de sucesso para avaliar a qualidade da resposta');
  }
  if (score.genericResponseRisk > 55) {
    suggestions.push('Reduz o risco de resposta genérica com detalhes e exemplos concretos');
  }
  if (score.overall < 70) {
    suggestions.push('Reduz instruções vagas como "bom" ou "interessante"');
  }
  
  // If score is high, give positive feedback
  if (suggestions.length === 0) {
    suggestions.push('O teu prompt está bem estruturado!');
    suggestions.push('Considera testar variações para otimizar ainda mais');
  }
  
  return suggestions.slice(0, 4);
};

const scoreLabels: Record<string, string> = {
  clarity: 'Clareza',
  context: 'Contexto',
  aiRole: 'Papel da IA',
  constraints: 'Restrições',
  outputFormat: 'Formato de output',
  successCriteria: 'Critérios de sucesso',
  genericResponseRisk: 'Risco de resposta genérica',
};

export default function ActionableScore({ score, onAutoFix }: ActionableScoreProps) {
  const { label, color } = getScoreLabel(score.overall);
  const suggestions = getImprovementSuggestions(score);
  const needsImprovement = score.overall < 80;
  const { canAccess, setPlan } = usePlanStore();
  const canSeeDetails = canAccess('canSeeDetailedScore');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          Prompt Score
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
                    Para aumentar o score:
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Pontos fortes:
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

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              {needsImprovement && onAutoFix && (
                <Button onClick={onAutoFix} className="gap-2">
                  <Wand2 className="h-4 w-4" />
                  Corrigir automaticamente
                </Button>
              )}
              <Link to="/learn" className={needsImprovement ? '' : 'col-span-2'}>
                <Button variant="outline" className="w-full gap-2">
                  <BookOpen className="h-4 w-4" />
                  Aprender a melhorar
                </Button>
              </Link>
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
                <span className="text-sm">Análise detalhada</span>
                <ProBadge feature="pro" />
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs h-7"
                onClick={() => setPlan('pro')}
              >
                Desbloquear
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
