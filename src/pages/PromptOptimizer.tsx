import { useState } from 'react';
import { Sparkles, Zap, FileText, Copy, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { OptimizationVariant } from '@/types/prompt';
import { usePlanStore } from '@/stores/planStore';
import { useAuthStore } from '@/stores/authStore';
import { OptimizationLimitNotice, AuthGate } from '@/components/gating/FeatureGate';
import ActionableScore from '@/components/optimizer/ActionableScore';
import ImprovementsList from '@/components/optimizer/ImprovementsList';

const mockOptimizations: OptimizationVariant[] = [
  { type: 'shorter', content: '', explanation: 'Versão condensada mantendo a essência', changes: ['Contexto redundante removido', 'Instruções simplificadas'] },
  { type: 'detailed', content: '', explanation: 'Mais contexto e especificações', changes: ['Exemplos adicionados', 'Restrições expandidas'] },
  { type: 'creative', content: '', explanation: 'Mais liberdade para respostas originais', changes: ['Criatividade incentivada', 'Menos restrições'] },
  { type: 'technical', content: '', explanation: 'Linguagem mais precisa e técnica', changes: ['Termos específicos', 'Estrutura formal'] },
  { type: 'restrictive', content: '', explanation: 'Controlo máximo sobre o output', changes: ['Formato estrito', 'Limites claros'] },
];

const improvementExamples = [
  'Objetivo clarificado com resultado esperado',
  'Formato de output definido explicitamente',
  'Ambiguidade reduzida nas instruções',
  'Tom e estilo especificados',
  'Público-alvo identificado',
];

export default function PromptOptimizer() {
  const [inputPrompt, setInputPrompt] = useState('');
  const [optimizations, setOptimizations] = useState<OptimizationVariant[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [score, setScore] = useState<{ clarity: number; specificity: number; structure: number; creativity: number; overall: number } | null>(null);
  const [selectedOptimization, setSelectedOptimization] = useState<OptimizationVariant | null>(null);
  const [currentPromptId] = useState(() => `prompt-${Date.now()}`); // Track optimizations per session
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { currentPlan, canOptimize, incrementOptimizationCount, getOptimizationCount } = usePlanStore();

  // Require authentication to use the optimizer
  if (!user) {
    return (
      <div className="p-6 animate-fade-in">
        <Card>
          <AuthGate message="Cria uma conta gratuita para otimizar os teus prompts." />
        </Card>
      </div>
    );
  }

  const optimizePrompt = async () => {
    if (!inputPrompt.trim()) {
      toast({ title: 'Atenção', description: 'Introduz um prompt para otimizar', variant: 'destructive' });
      return;
    }

    // Check optimization limit for free users
    if (currentPlan === 'free' && !canOptimize(currentPromptId)) {
      toast({ 
        title: 'Limite atingido', 
        description: 'Upgrade para Pro para otimizações ilimitadas', 
        variant: 'destructive' 
      });
      return;
    }

    setIsOptimizing(true);
    
    // Increment optimization count for free users
    if (currentPlan === 'free') {
      incrementOptimizationCount(currentPromptId);
    }

    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    
    const results = mockOptimizations.map(opt => ({
      ...opt,
      content: opt.type === 'shorter' 
        ? inputPrompt.substring(0, Math.floor(inputPrompt.length * 0.6)) + '...'
        : opt.type === 'detailed'
        ? `[CONTEXTO]\n${inputPrompt}\n\n[INSTRUÇÕES]\n- Segue o objetivo definido\n- Mantém consistência\n\n[OUTPUT ESPERADO]\nResultado claro e estruturado.`
        : opt.type === 'creative'
        ? `${inputPrompt}\n\nSê criativo e surpreende com abordagens originais. Explora diferentes ângulos e perspetivas inesperadas.`
        : opt.type === 'technical'
        ? `OBJETIVO: ${inputPrompt}\n\nESPECIFICAÇÕES:\n- Precisão técnica requerida\n- Terminologia específica\n- Formato estruturado`
        : `${inputPrompt}\n\nRESTRIÇÕES OBRIGATÓRIAS:\n- Máximo 500 palavras\n- Tom profissional\n- Sem ambiguidades`
    }));
    
    setOptimizations(results);
    setScore({ clarity: 72, specificity: 65, structure: 80, creativity: 55, overall: 68 });
    setSelectedOptimization(results[1]); // Select detailed by default
    setIsOptimizing(false);

    // Mark onboarding step as complete
    const completed = localStorage.getItem('onboarding-completed');
    const steps = completed ? JSON.parse(completed) : [];
    if (!steps.includes('optimize')) {
      localStorage.setItem('onboarding-completed', JSON.stringify([...steps, 'optimize']));
    }
  };

  const handleAutoFix = () => {
    if (optimizations.length > 0) {
      const detailed = optimizations.find(o => o.type === 'detailed');
      if (detailed) {
        setInputPrompt(detailed.content);
        setScore({ clarity: 88, specificity: 85, structure: 92, creativity: 70, overall: 84 });
        toast({ title: 'Prompt melhorado!', description: 'As correções automáticas foram aplicadas' });
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Prompt copiado para a área de transferência' });
  };

  const typeLabels: Record<string, { label: string; icon: string; description: string }> = {
    shorter: { label: 'Mais Curto', icon: '⚡', description: 'Versão condensada e directa' },
    detailed: { label: 'Mais Detalhado', icon: '📝', description: 'Contexto e exemplos adicionais' },
    creative: { label: 'Mais Criativo', icon: '🎨', description: 'Liberdade para originalidade' },
    technical: { label: 'Mais Técnico', icon: '🔧', description: 'Precisão e especificidade' },
    restrictive: { label: 'Mais Controlado', icon: '🎯', description: 'Formato e limites estritos' },
  };

  const remainingOptimizations = currentPlan === 'free' ? 3 - getOptimizationCount(currentPromptId) : null;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Optimization limit notice for free users */}
      <OptimizationLimitNotice promptId={currentPromptId} />

      {/* Intro tip */}
      <div className="rounded-lg bg-info/10 border border-info/20 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Como funciona a otimização?</p>
          <p className="text-xs text-muted-foreground mt-1">
            Cola o teu prompt e obtém variações otimizadas com explicações detalhadas do que foi melhorado. 
            Cada alteração vem acompanhada de uma justificação para te ajudar a aprender.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prompt Original
            </CardTitle>
            <CardDescription>Cola ou define o prompt que queres otimizar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea 
                placeholder="Ex: Escreve um post para Instagram sobre sustentabilidade..." 
                value={inputPrompt} 
                onChange={(e) => setInputPrompt(e.target.value)} 
                className="min-h-[200px]" 
              />
              <p className="text-xs text-muted-foreground">
                💡 Este campo define o ponto de partida. Quanto mais detalhes, melhores as otimizações.
              </p>
            </div>
            <Button onClick={optimizePrompt} disabled={isOptimizing} className="w-full">
              {isOptimizing ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-pulse" />
                  A analisar e otimizar...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Otimizar Prompt
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Score */}
        {score ? (
          <ActionableScore score={score} onAutoFix={handleAutoFix} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Prompt Score
              </CardTitle>
              <CardDescription>Análise da qualidade do teu prompt</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Otimiza um prompt para ver o score</p>
                <p className="text-xs mt-2">O score analisa clareza, especificidade, estrutura e criatividade</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Improvements explanation */}
      {selectedOptimization && inputPrompt && (
        <ImprovementsList 
          originalPrompt={inputPrompt}
          optimizedPrompt={selectedOptimization.content}
          improvements={improvementExamples}
        />
      )}

      {/* Optimizations */}
      {optimizations.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Variações Otimizadas</h3>
            <p className="text-sm text-muted-foreground">Clica numa variação para ver os detalhes e comparar</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {optimizations.map((opt) => (
              <Card 
                key={opt.type} 
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  selectedOptimization?.type === opt.type ? 'border-primary ring-2 ring-primary/20' : ''
                }`}
                onClick={() => setSelectedOptimization(opt)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{typeLabels[opt.type].icon}</span>
                    {typeLabels[opt.type].label}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {typeLabels[opt.type].description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-4 font-mono bg-muted/50 p-2 rounded">
                    {opt.content}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {opt.changes.map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        ✓ {c}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(opt.content);
                    }}
                  >
                    <Copy className="h-3 w-3 mr-2" />
                    Copiar esta versão
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
