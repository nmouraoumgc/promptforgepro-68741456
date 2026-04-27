import { ArrowRightLeft, BookOpen, Copy, Rocket, Scissors } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BeforeAfterShowcaseProps {
  isEnglish: boolean;
  beforePrompt: string;
  afterPrompt: string;
  explanation: string;
  shortVersion: string;
  advancedVersion: string;
  onCopy: (text: string) => void;
}

export default function BeforeAfterShowcase({
  isEnglish,
  beforePrompt,
  afterPrompt,
  explanation,
  shortVersion,
  advancedVersion,
  onCopy,
}: BeforeAfterShowcaseProps) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          {isEnglish ? 'Before / After Prompt Optimizer' : 'Otimizador de Prompt Antes / Depois'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-xs font-semibold text-destructive mb-2">{isEnglish ? 'Before: weak prompt' : 'Antes: prompt fraco'}</p>
            <p className="text-sm font-mono whitespace-pre-wrap">{beforePrompt}</p>
          </div>

          <div className="rounded-lg border border-success/20 bg-success/5 p-3">
            <p className="text-xs font-semibold text-success mb-2">{isEnglish ? 'After: structured prompt' : 'Depois: prompt estruturado'}</p>
            <p className="text-sm font-mono whitespace-pre-wrap">{afterPrompt}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            {isEnglish ? 'Explanation: what improved' : 'Explicação: o que foi melhorado'}
          </p>
          <p className="text-sm">{explanation}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-background p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Scissors className="h-3.5 w-3.5" />
              {isEnglish ? 'Short version (quick use)' : 'Versão curta (uso rápido)'}
            </p>
            <p className="text-sm font-mono whitespace-pre-wrap">{shortVersion}</p>
            <Button variant="outline" size="sm" onClick={() => onCopy(shortVersion)}>
              <Copy className="h-3 w-3 mr-2" />
              {isEnglish ? 'Copy short version' : 'Copiar versão curta'}
            </Button>
          </div>

          <div className="rounded-lg border bg-background p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Rocket className="h-3.5 w-3.5" />
              {isEnglish ? 'Advanced version (professional use)' : 'Versão avançada (uso profissional)'}
            </p>
            <p className="text-sm font-mono whitespace-pre-wrap">{advancedVersion}</p>
            <Button variant="outline" size="sm" onClick={() => onCopy(advancedVersion)}>
              <Copy className="h-3 w-3 mr-2" />
              {isEnglish ? 'Copy advanced version' : 'Copiar versão avançada'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
