import { useState } from 'react';
import { Sparkles, Zap, FileText, Wand2, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { OptimizationVariant } from '@/types/prompt';

const mockOptimizations: OptimizationVariant[] = [
  { type: 'shorter', content: '', explanation: 'Versão condensada mantendo a essência', changes: ['Removido contexto redundante', 'Simplificado instruções'] },
  { type: 'detailed', content: '', explanation: 'Mais contexto e especificações', changes: ['Adicionado exemplos', 'Expandido restrições'] },
  { type: 'creative', content: '', explanation: 'Mais liberdade para respostas originais', changes: ['Incentivo à criatividade', 'Menos restrições'] },
  { type: 'technical', content: '', explanation: 'Linguagem mais precisa e técnica', changes: ['Termos específicos', 'Estrutura formal'] },
  { type: 'restrictive', content: '', explanation: 'Controlo máximo sobre o output', changes: ['Formato estrito', 'Limites claros'] },
];

export default function PromptOptimizer() {
  const [inputPrompt, setInputPrompt] = useState('');
  const [optimizations, setOptimizations] = useState<OptimizationVariant[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [score, setScore] = useState<{ clarity: number; specificity: number; structure: number; creativity: number; overall: number } | null>(null);
  const { toast } = useToast();

  const optimizePrompt = async () => {
    if (!inputPrompt.trim()) {
      toast({ title: 'Erro', description: 'Introduz um prompt para otimizar', variant: 'destructive' });
      return;
    }
    setIsOptimizing(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    
    const results = mockOptimizations.map(opt => ({
      ...opt,
      content: opt.type === 'shorter' 
        ? inputPrompt.substring(0, Math.floor(inputPrompt.length * 0.6)) + '...'
        : opt.type === 'detailed'
        ? inputPrompt + '\n\n[Contexto adicional]\n[Exemplos específicos]\n[Formato esperado detalhado]'
        : inputPrompt + ` [Variação ${opt.type}]`
    }));
    
    setOptimizations(results);
    setScore({ clarity: 72, specificity: 65, structure: 80, creativity: 55, overall: 68 });
    setIsOptimizing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  const typeLabels: Record<string, { label: string; icon: string }> = {
    shorter: { label: 'Mais Curto', icon: '⚡' },
    detailed: { label: 'Mais Detalhado', icon: '📝' },
    creative: { label: 'Mais Criativo', icon: '🎨' },
    technical: { label: 'Mais Técnico', icon: '🔧' },
    restrictive: { label: 'Mais Restritivo', icon: '🎯' },
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Prompt Original</CardTitle>
            <CardDescription>Cola ou escreve o prompt que queres otimizar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea placeholder="O teu prompt aqui..." value={inputPrompt} onChange={(e) => setInputPrompt(e.target.value)} className="min-h-[200px]" />
            <Button onClick={optimizePrompt} disabled={isOptimizing} className="w-full">
              {isOptimizing ? <><Zap className="h-4 w-4 mr-2 animate-pulse" />A otimizar...</> : <><Sparkles className="h-4 w-4 mr-2" />Otimizar Prompt</>}
            </Button>
          </CardContent>
        </Card>

        {/* Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5" />Prompt Score</CardTitle>
            <CardDescription>Análise da qualidade do teu prompt</CardDescription>
          </CardHeader>
          <CardContent>
            {score ? (
              <div className="space-y-4">
                <div className="text-center p-6 rounded-lg bg-muted">
                  <span className="text-5xl font-bold text-primary">{score.overall}%</span>
                  <p className="text-muted-foreground mt-2">Score Geral</p>
                </div>
                <div className="space-y-3">
                  {Object.entries(score).filter(([k]) => k !== 'overall').map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm"><span className="capitalize">{key}</span><span>{value}%</span></div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${value}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Otimiza um prompt para ver o score</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Optimizations */}
      {optimizations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Variações Otimizadas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {optimizations.map((opt) => (
              <Card key={opt.type} className="hover:border-primary/50 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{typeLabels[opt.type].icon}</span>
                    {typeLabels[opt.type].label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-4">{opt.content}</p>
                  <div className="flex flex-wrap gap-1">
                    {opt.changes.map((c, i) => <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>)}
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => copyToClipboard(opt.content)}>
                    <Copy className="h-3 w-3 mr-2" />Copiar
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
