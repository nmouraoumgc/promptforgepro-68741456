import { useState } from 'react';
import { Eye, Sparkles, Target, FileText, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const examplePrompt = {
  objective: 'Criar um post viral para Instagram sobre sustentabilidade que gere engagement e partilhas',
  finalPrompt: `[CONTEXTO]
Objetivo: Criar um post para Instagram sobre sustentabilidade que maximize o engagement e incentive partilhas.
Público-alvo: Jovens adultos (25-40 anos) interessados em lifestyle consciente e ecologia.

[INSTRUÇÕES]
Gera um texto que:
- Comece com um hook emocional nos primeiros 3 segundos
- Use storytelling pessoal para conectar
- Inclua dados impactantes mas acessíveis
- Termine com uma chamada à ação clara

[RESTRIÇÕES]
- Formato: Máximo 2200 caracteres
- Tom: Inspirador mas não preachy
- Evitar: Culpabilização do leitor

[OUTPUT ESPERADO]
Texto completo pronto para publicar, com sugestão de emojis estratégicos e 5 hashtags relevantes.`,
  score: {
    overall: 92,
    clarity: 95,
    specificity: 90,
    structure: 94,
    creativity: 88,
  },
  improvements: [
    'Contexto detalhado com público-alvo específico',
    'Instruções sequenciais e claras',
    'Restrições bem definidas (formato, tom, limites)',
    'Output esperado explícito',
    'Hook emocional definido para retenção',
  ],
};

export default function ExamplePromptShowcase() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Card className="h-full border-border/50 hover:border-primary/30 transition-colors">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Exemplo</span>
            </div>
            <Badge variant="secondary" className="text-xs bg-success/10 text-success border-0">
              {examplePrompt.score.overall}%
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-3">
            {examplePrompt.objective}
          </p>

          <Button 
            onClick={() => setShowModal(true)} 
            variant="ghost"
            size="sm"
            className="w-full text-xs gap-2 text-muted-foreground hover:text-foreground"
          >
            <Eye className="h-3 w-3" />
            Ver detalhes
          </Button>
        </CardContent>
      </Card>

      {/* Educational Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              Anatomia de um Prompt Eficaz
            </DialogTitle>
            <DialogDescription>
              Compreende a estrutura que garante resultados consistentes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Objective */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">1. Objetivo Claro</h3>
              </div>
              <p className="text-sm text-muted-foreground ml-10">
                "{examplePrompt.objective}"
              </p>
              <p className="text-xs text-success ml-10">
                ✓ Específico, mensurável e com resultado esperado definido
              </p>
            </div>

            {/* Structure */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                  <FileText className="h-4 w-4 text-info" />
                </div>
                <h3 className="font-semibold">2. Estrutura do Prompt</h3>
              </div>
              
              <div className="ml-10 space-y-3">
                <div className="rounded-lg border border-context/30 bg-context/5 p-3">
                  <p className="text-xs font-medium text-context mb-1">[CONTEXTO]</p>
                  <p className="text-xs text-muted-foreground">Define quem és, o que queres e para quem é o conteúdo</p>
                </div>
                
                <div className="rounded-lg border border-instruction/30 bg-instruction/5 p-3">
                  <p className="text-xs font-medium text-instruction mb-1">[INSTRUÇÕES]</p>
                  <p className="text-xs text-muted-foreground">Passos específicos que a IA deve seguir</p>
                </div>
                
                <div className="rounded-lg border border-restriction/30 bg-restriction/5 p-3">
                  <p className="text-xs font-medium text-restriction mb-1">[RESTRIÇÕES]</p>
                  <p className="text-xs text-muted-foreground">Limites claros: formato, tom, o que evitar</p>
                </div>
                
                <div className="rounded-lg border border-output/30 bg-output/5 p-3">
                  <p className="text-xs font-medium text-output mb-1">[OUTPUT ESPERADO]</p>
                  <p className="text-xs text-muted-foreground">Descrição exata do resultado final</p>
                </div>
              </div>
            </div>

            {/* Why high score */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                  <Sparkles className="h-4 w-4 text-success" />
                </div>
                <h3 className="font-semibold">3. Porque o Score é Alto ({examplePrompt.score.overall}%)</h3>
              </div>
              <ul className="ml-10 space-y-1">
                {examplePrompt.improvements.map((improvement, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-success">✓</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
              <p className="text-sm font-medium mb-2">Pronto para criar prompts assim?</p>
              <Button onClick={() => setShowModal(false)} asChild>
                <a href="/builder">Começar a Construir</a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
