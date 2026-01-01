import { useState } from 'react';
import { FlaskConical, ArrowLeftRight, Trophy, ThumbsUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { usePlanStore } from '@/stores/planStore';
import { UpgradePrompt } from '@/components/gating/FeatureGate';

export default function PromptTester() {
  const { canAccess } = usePlanStore();
  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');
  const [responseA, setResponseA] = useState('');
  const [responseB, setResponseB] = useState('');
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Gate A/B testing for free users
  if (!canAccess('canAccessABTesting')) {
    return (
      <div className="p-6 animate-fade-in">
        <Card>
          <UpgradePrompt 
            feature="pro"
            title="Comparação A/B"
            description="Testa dois prompts lado a lado e descobre qual gera melhores resultados. Otimiza com dados reais."
          />
        </Card>
      </div>
    );
  }

  const runTest = async () => {
    if (!promptA || !promptB) return;
    setIsTesting(true);
    await new Promise(r => setTimeout(r, 1500));
    setResponseA('Esta é uma resposta simulada para o Prompt A. Numa versão completa, isto seria gerado por uma IA real baseada no teu prompt.');
    setResponseB('Esta é uma resposta simulada para o Prompt B. Compara as duas respostas para decidir qual prompt funciona melhor.');
    setIsTesting(false);

    // Mark onboarding step as complete
    const completed = localStorage.getItem('onboarding-completed');
    const steps = completed ? JSON.parse(completed) : [];
    if (!steps.includes('compare')) {
      localStorage.setItem('onboarding-completed', JSON.stringify([...steps, 'compare']));
    }
  };

  const selectWinner = (choice: 'A' | 'B') => {
    setWinner(choice);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5" />Comparação A/B</CardTitle>
          <CardDescription>Testa dois prompts lado a lado e escolhe o melhor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Prompt A */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-lg px-3 py-1">A</Badge>
                <span className="font-medium">Prompt A</span>
                {winner === 'A' && <Trophy className="h-5 w-5 text-warning" />}
              </div>
              <Textarea placeholder="Escreve o primeiro prompt..." value={promptA} onChange={(e) => setPromptA(e.target.value)} className="min-h-[120px]" />
              {responseA && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-2">Resposta:</p>
                    <p className="text-sm text-muted-foreground">{responseA}</p>
                  </CardContent>
                </Card>
              )}
              {responseA && !winner && (
                <Button variant="outline" className="w-full" onClick={() => selectWinner('A')}>
                  <ThumbsUp className="h-4 w-4 mr-2" />Escolher A
                </Button>
              )}
            </div>

            {/* Prompt B */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-lg px-3 py-1">B</Badge>
                <span className="font-medium">Prompt B</span>
                {winner === 'B' && <Trophy className="h-5 w-5 text-warning" />}
              </div>
              <Textarea placeholder="Escreve o segundo prompt..." value={promptB} onChange={(e) => setPromptB(e.target.value)} className="min-h-[120px]" />
              {responseB && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-2">Resposta:</p>
                    <p className="text-sm text-muted-foreground">{responseB}</p>
                  </CardContent>
                </Card>
              )}
              {responseB && !winner && (
                <Button variant="outline" className="w-full" onClick={() => selectWinner('B')}>
                  <ThumbsUp className="h-4 w-4 mr-2" />Escolher B
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <Button onClick={runTest} disabled={!promptA || !promptB || isTesting} size="lg">
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              {isTesting ? 'A testar...' : 'Testar Prompts'}
            </Button>
          </div>

          {winner && (
            <div className="text-center mt-6 p-4 rounded-lg bg-success/10">
              <Trophy className="h-8 w-8 mx-auto text-warning mb-2" />
              <p className="font-medium">Prompt {winner} selecionado como vencedor!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
