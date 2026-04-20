import { useTranslation } from 'react-i18next';
import { BookOpen, Lightbulb, Target, Zap, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const tipsByLang = {
  pt: [
    { icon: Target, title: 'Sê Específico', description: 'Quanto mais detalhes deres, melhor será o resultado. Evita instruções vagas.', level: 'Básico' },
    { icon: Zap, title: 'Define o Formato', description: 'Diz explicitamente se queres lista, parágrafo, código, tabela, etc.', level: 'Básico' },
    { icon: Lightbulb, title: 'Dá Exemplos', description: 'Mostrar exemplos do que esperas ajuda a IA a entender o padrão.', level: 'Intermédio' },
    { icon: CheckCircle, title: 'Usa Restrições', description: 'Limita o comprimento, exclui tópicos, define o tom desejado.', level: 'Intermédio' },
  ],
  en: [
    { icon: Target, title: 'Be Specific', description: 'The more details you give, the better the result. Avoid vague instructions.', level: 'Basic' },
    { icon: Zap, title: 'Define the Format', description: 'Explicitly say if you want a list, paragraph, code, table, etc.', level: 'Basic' },
    { icon: Lightbulb, title: 'Give Examples', description: 'Showing examples of what you expect helps the AI understand the pattern.', level: 'Intermediate' },
    { icon: CheckCircle, title: 'Use Constraints', description: 'Limit length, exclude topics, set the desired tone.', level: 'Intermediate' },
  ],
};

const lessonsByLang = {
  pt: [
    { title: 'Anatomia de um Bom Prompt', duration: '5 min', level: 'Iniciante' },
    { title: 'Variáveis Dinâmicas', duration: '8 min', level: 'Intermédio' },
    { title: 'Prompts para Imagens', duration: '10 min', level: 'Avançado' },
    { title: 'Chain of Thought', duration: '12 min', level: 'Avançado' },
  ],
  en: [
    { title: 'Anatomy of a Good Prompt', duration: '5 min', level: 'Beginner' },
    { title: 'Dynamic Variables', duration: '8 min', level: 'Intermediate' },
    { title: 'Prompts for Images', duration: '10 min', level: 'Advanced' },
    { title: 'Chain of Thought', duration: '12 min', level: 'Advanced' },
  ],
};

export default function Learn() {
  const { t, i18n } = useTranslation();
  const lang = ((i18n.resolvedLanguage || i18n.language || 'pt').slice(0, 2) === 'en' ? 'en' : 'pt') as 'pt' | 'en';
  const tips = tipsByLang[lang];
  const lessons = lessonsByLang[lang];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-warning" />{t('learn.tipsTitle')}</CardTitle>
            <CardDescription>{t('learn.tipsDesc')}</CardDescription>
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
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />{t('learn.lessonsTitle')}</CardTitle>
            <CardDescription>{t('learn.lessonsDesc')}</CardDescription>
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
