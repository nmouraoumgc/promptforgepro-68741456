import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import BeforeAfterShowcase from '@/components/optimizer/BeforeAfterShowcase';
import { supabase } from '@/integrations/supabase/client';

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
  const [score, setScore] = useState<{
    clarity: number;
    context: number;
    aiRole: number;
    constraints: number;
    outputFormat: number;
    successCriteria: number;
    genericResponseRisk: number;
    overall: number;
  } | null>(null);
  const [selectedOptimization, setSelectedOptimization] = useState<OptimizationVariant | null>(null);
  const [currentPromptId] = useState(() => `prompt-${Date.now()}`); // Track optimizations per session
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
  const language = (i18n.resolvedLanguage || i18n.language || 'pt').slice(0, 2);
  const { user } = useAuthStore();
  const { currentPlan, canOptimize, incrementOptimizationCount, getOptimizationCount } = usePlanStore();

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

  const [improvements, setImprovements] = useState<string[]>([]);

  const optimizePrompt = async () => {
    if (!inputPrompt.trim()) {
      toast({ title: isEnglish ? 'Warning' : 'Atenção', description: isEnglish ? 'Enter a prompt to optimize' : 'Introduz um prompt para otimizar', variant: 'destructive' });
      return;
    }

    // Check optimization limit for free users
    if (currentPlan === 'free' && !canOptimize(currentPromptId)) {
      toast({ title: isEnglish ? 'Limit reached' : 'Limite atingido', description: isEnglish ? 'Upgrade to Pro for unlimited optimizations' : 'Upgrade para Pro para otimizações ilimitadas', variant: 'destructive' });
      return;
    }

    setIsOptimizing(true);
    
    // Increment optimization count for free users
    if (currentPlan === 'free') {
      incrementOptimizationCount(currentPromptId);
    }

    try {
      const { data, error } = await supabase.functions.invoke('optimize-prompt', {
        body: { prompt: inputPrompt, language }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: isEnglish ? 'Error' : 'Erro', description: data.error, variant: 'destructive' });
        setIsOptimizing(false);
        return;
      }

      setOptimizations(data.optimizations || []);
      setScore(data.score || null);
      setImprovements(data.improvements || []);
      if (data.optimizations?.length > 0) {
        setSelectedOptimization(data.optimizations.find((o: OptimizationVariant) => o.type === 'detailed') || data.optimizations[0]);
      }

      // Mark onboarding step as complete
      const completed = localStorage.getItem('onboarding-completed');
      const steps = completed ? JSON.parse(completed) : [];
      if (!steps.includes('optimize')) {
        localStorage.setItem('onboarding-completed', JSON.stringify([...steps, 'optimize']));
      }
    } catch (error) {
      console.error('Error optimizing prompt:', error);
      toast({ title: isEnglish ? 'Error' : 'Erro', description: isEnglish ? 'Could not optimize the prompt. Try again.' : 'Não foi possível otimizar o prompt. Tenta novamente.', variant: 'destructive' });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAutoFix = () => {
    if (optimizations.length > 0) {
      const detailed = optimizations.find(o => o.type === 'detailed');
      if (detailed) {
        setInputPrompt(detailed.content);
        setScore({
          clarity: 88,
          context: 84,
          aiRole: 82,
          constraints: 86,
          outputFormat: 90,
          successCriteria: 80,
          genericResponseRisk: 24,
          overall: 84,
        });
        toast({ title: isEnglish ? 'Prompt improved!' : 'Prompt melhorado!', description: isEnglish ? 'Automatic fixes were applied' : 'As correções automáticas foram aplicadas' });
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: isEnglish ? 'Copied!' : 'Copiado!', description: isEnglish ? 'Prompt copied to clipboard' : 'Prompt copiado para a área de transferência' });
  };

  const typeLabels: Record<string, { label: string; icon: string; description: string }> = {
    shorter: { label: isEnglish ? 'Shorter' : 'Mais Curto', icon: '⚡', description: isEnglish ? 'Condensed version' : 'Versão condensada e directa' },
    detailed: { label: isEnglish ? 'More Detailed' : 'Mais Detalhado', icon: '📝', description: isEnglish ? 'More context and examples' : 'Contexto e exemplos adicionais' },
    creative: { label: isEnglish ? 'More Creative' : 'Mais Criativo', icon: '🎨', description: isEnglish ? 'More freedom for originality' : 'Liberdade para originalidade' },
    technical: { label: isEnglish ? 'More Technical' : 'Mais Técnico', icon: '🔧', description: isEnglish ? 'Precision and specificity' : 'Precisão e especificidade' },
    restrictive: { label: isEnglish ? 'More Controlled' : 'Mais Controlado', icon: '🎯', description: isEnglish ? 'Strict format and limits' : 'Formato e limites estritos' },
  };

  const remainingOptimizations = currentPlan === 'free' ? 3 - getOptimizationCount(currentPromptId) : null;

  const shorterOptimization = optimizations.find((o) => o.type === 'shorter');
  const detailedOptimization = optimizations.find((o) => o.type === 'detailed');
  const technicalOptimization = optimizations.find((o) => o.type === 'technical');


  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Optimization limit notice for free users */}
      <OptimizationLimitNotice promptId={currentPromptId} />

      {/* Intro tip */}
      <div className="rounded-lg bg-info/10 border border-info/20 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">{isEnglish ? 'How optimization works' : 'Como funciona a otimização?'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isEnglish
              ? 'Paste your prompt and get optimized variations with detailed explanations of what improved.'
              : 'Cola o teu prompt e obtém variações otimizadas com explicações detalhadas do que foi melhorado.'}
            {' '}
            {isEnglish
              ? 'Each change includes a clear rationale so you can learn from it.'
              : 'Cada alteração vem acompanhada de uma justificação para te ajudar a aprender.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isEnglish ? 'Original Prompt' : 'Prompt Original'}
            </CardTitle>
            <CardDescription>{isEnglish ? 'Paste or write the prompt you want to optimize' : 'Cola ou define o prompt que queres otimizar'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea 
                placeholder={isEnglish ? 'Ex: Write an Instagram post about sustainability...' : 'Ex: Escreve um post para Instagram sobre sustentabilidade...'} 
                value={inputPrompt} 
                onChange={(e) => setInputPrompt(e.target.value)} 
                className="min-h-[200px]" 
              />
              <p className="text-xs text-muted-foreground">
                {isEnglish ? '💡 This field defines the starting point. More detail leads to better optimizations.' : '💡 Este campo define o ponto de partida. Quanto mais detalhes, melhores as otimizações.'}
              </p>
            </div>
            <Button onClick={optimizePrompt} disabled={isOptimizing} className="w-full">
              {isOptimizing ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-pulse" />
                  {isEnglish ? 'Analyzing and optimizing...' : 'A analisar e otimizar...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isEnglish ? 'Optimize Prompt' : 'Otimizar Prompt'}
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
                {isEnglish ? 'Prompt Score' : 'Prompt Score'}
              </CardTitle>
              <CardDescription>{isEnglish ? 'Quality analysis of your prompt' : 'Análise da qualidade do teu prompt'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">{isEnglish ? 'Optimize a prompt to see the score' : 'Otimiza um prompt para ver o score'}</p>
                <p className="text-xs mt-2">
                  {isEnglish
                    ? 'The score analyzes clarity, context, AI role, constraints, output format, success criteria and generic-response risk'
                    : 'O score analisa clareza, contexto, papel da IA, restrições, formato de output, critérios de sucesso e risco de resposta genérica'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Before / After learning showcase */}
      {optimizations.length > 0 && detailedOptimization && (
        <BeforeAfterShowcase
          isEnglish={isEnglish}
          beforePrompt={inputPrompt}
          afterPrompt={detailedOptimization.content}
          explanation={selectedOptimization?.explanation || detailedOptimization.explanation || (isEnglish ? 'The optimized version adds context, structure and clear constraints so the AI can produce a higher-quality result.' : 'A versão otimizada adiciona contexto, estrutura e restrições claras para a IA gerar um resultado de maior qualidade.')}
          shortVersion={shorterOptimization?.content || detailedOptimization.content}
          advancedVersion={technicalOptimization?.content || detailedOptimization.content}
          onCopy={copyToClipboard}
        />
      )}

      {/* Improvements explanation */}
      {selectedOptimization && inputPrompt && (
        <ImprovementsList 
          originalPrompt={inputPrompt}
          optimizedPrompt={selectedOptimization.content}
          improvements={improvements.length > 0 ? improvements : (isEnglish ? ['Objective clarified', 'Structure improved', 'Tone specified'] : ['Objetivo clarificado', 'Estrutura melhorada', 'Tom especificado'])}
        />
      )}

      {/* Optimizations */}
      {optimizations.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{isEnglish ? 'Optimized Variations' : 'Variações Otimizadas'}</h3>
            <p className="text-sm text-muted-foreground">{isEnglish ? 'Click a variation to inspect details and compare' : 'Clica numa variação para ver os detalhes e comparar'}</p>
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
                    {isEnglish ? 'Copy this version' : 'Copiar esta versão'}
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
