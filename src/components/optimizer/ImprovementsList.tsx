import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, GitCompare, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ImprovementsListProps {
  originalPrompt: string;
  optimizedPrompt: string;
  improvements: string[];
}

export default function ImprovementsList({ originalPrompt, optimizedPrompt, improvements }: ImprovementsListProps) {
  const [viewMode, setViewMode] = useState<'original' | 'optimized' | 'diff'>('optimized');

  // Simple diff highlighting (in production, use a proper diff library)
  const renderDiff = () => {
    const originalWords = originalPrompt.split(/\s+/);
    const optimizedWords = optimizedPrompt.split(/\s+/);
    
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20">
          <p className="text-xs font-medium text-destructive mb-2">− Original</p>
          <p className="text-sm text-muted-foreground">{originalPrompt}</p>
        </div>
        <div className="rounded-lg bg-success/10 p-3 border border-success/20">
          <p className="text-xs font-medium text-success mb-2">+ Otimizado</p>
          <p className="text-sm">{optimizedPrompt}</p>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-warning" />
          O que foi melhorado neste prompt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Improvements list */}
        <div className="space-y-2">
          {improvements.map((improvement, index) => (
            <div key={index} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <span className="text-sm">{improvement}</span>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="original" className="text-xs gap-1">
              <EyeOff className="h-3 w-3" />
              Original
            </TabsTrigger>
            <TabsTrigger value="optimized" className="text-xs gap-1">
              <Eye className="h-3 w-3" />
              Otimizado
            </TabsTrigger>
            <TabsTrigger value="diff" className="text-xs gap-1">
              <GitCompare className="h-3 w-3" />
              Diferenças
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-3 rounded-lg bg-muted/50 p-4 min-h-[100px]">
            <TabsContent value="original" className="mt-0">
              <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                {originalPrompt || 'Nenhum prompt original'}
              </pre>
            </TabsContent>
            <TabsContent value="optimized" className="mt-0">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {optimizedPrompt || 'Nenhum prompt otimizado'}
              </pre>
            </TabsContent>
            <TabsContent value="diff" className="mt-0">
              {renderDiff()}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
