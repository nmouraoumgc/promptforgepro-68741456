import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Wand2, Sparkles, GitCompare, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePromptStore } from '@/stores/promptStore';

const onboardingSteps = [
  {
    id: 'create',
    title: 'Cria o teu primeiro prompt',
    description: 'Usa o construtor guiado para criar um prompt estruturado',
    icon: Wand2,
    link: '/builder',
    action: 'Criar Prompt',
  },
  {
    id: 'optimize',
    title: 'Otimiza um prompt',
    description: 'Descobre como melhorar automaticamente os teus prompts',
    icon: Sparkles,
    link: '/optimizer',
    action: 'Otimizar',
  },
  {
    id: 'compare',
    title: 'Compara e guarda',
    description: 'Testa diferentes versões e guarda as melhores',
    icon: GitCompare,
    link: '/tester',
    action: 'Comparar',
  },
];

export default function OnboardingChecklist() {
  const { prompts } = usePromptStore();
  const [dismissed, setDismissed] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    // Check localStorage for dismissed state
    const isDismissed = localStorage.getItem('onboarding-dismissed');
    if (isDismissed === 'true') {
      setDismissed(true);
    }

    // Check completed steps
    const completed = localStorage.getItem('onboarding-completed');
    if (completed) {
      setCompletedSteps(JSON.parse(completed));
    }

    // Auto-complete 'create' if user has prompts
    if (prompts.length > 0 && !completedSteps.includes('create')) {
      markStepComplete('create');
    }
  }, [prompts.length]);

  const markStepComplete = (stepId: string) => {
    const newCompleted = [...completedSteps, stepId];
    setCompletedSteps(newCompleted);
    localStorage.setItem('onboarding-completed', JSON.stringify(newCompleted));
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('onboarding-dismissed', 'true');
  };

  const progress = (completedSteps.length / onboardingSteps.length) * 100;
  const allComplete = completedSteps.length === onboardingSteps.length;

  if (dismissed || allComplete) return null;

  return (
    <Card className="border-info/30 bg-gradient-to-br from-info/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            🚀 Começa em 3 Passos Simples
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span>{completedSteps.length}/{onboardingSteps.length} completos</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {onboardingSteps.map((step, index) => {
          const isComplete = completedSteps.includes(step.id);
          const Icon = step.icon;
          
          return (
            <div 
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isComplete 
                  ? 'bg-success/10 border border-success/20' 
                  : 'bg-muted/50 hover:bg-muted/70'
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                isComplete ? 'bg-success text-success-foreground' : 'bg-muted'
              }`}>
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              <div className="flex-1">
                <p className={`text-sm font-medium ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              
              {!isComplete && (
                <Link to={step.link}>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Icon className="h-3 w-3" />
                    {step.action}
                  </Button>
                </Link>
              )}
            </div>
          );
        })}
        
        <p className="text-xs text-muted-foreground text-center pt-2">
          Completa estes passos em menos de 30 segundos
        </p>
      </CardContent>
    </Card>
  );
}
