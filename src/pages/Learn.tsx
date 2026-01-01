import { BookOpen, Lightbulb, Target, Zap, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const tips = [
  { icon: Target, title: 'Sê Específico', description: 'Quanto mais detalhes deres, melhor será o resultado. Evita instruções vagas.', level: 'Básico' },
  { icon: Zap, title: 'Define o Formato', description: 'Diz explicitamente se queres lista, parágrafo, código, tabela, etc.', level: 'Básico' },
  { icon: Lightbulb, title: 'Dá Exemplos', description: 'Mostrar exemplos do que esperas ajuda a IA a entender o padrão.', level: 'Intermédio' },
  { icon: CheckCircle, title: 'Usa Restrições', description: 'Limita o comprimento, exclui tópicos, define o tom desejado.', level: 'Intermédio' },
];

const lessons = [
  { title: 'Anatomia de um Bom Prompt', duration: '5 min', level: 'Iniciante' },
  { title: 'Variáveis Dinâmicas', duration: '8 min', level: 'Intermédio' },
  { title: 'Prompts para Imagens', duration: '10 min', level: 'Avançado' },
  { title: 'Chain of Thought', duration: '12 min', level: 'Avançado' },
];

export default function Learn() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-warning" />Dicas Rápidas</CardTitle>
            <CardDescription>Melhora os teus prompts com estas técnicas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tips.map((tip, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <tip.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{tip.title}</span>
                    <Badge variant="secondary">{tip.level}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{tip.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />Lições</CardTitle>
            <CardDescription>Aprende a criar prompts profissionais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lessons.map((lesson, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all">
                <div>
                  <p className="font-medium">{lesson.title}</p>
                  <p className="text-sm text-muted-foreground">{lesson.duration}</p>
                </div>
                <Badge variant="outline">{lesson.level}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
