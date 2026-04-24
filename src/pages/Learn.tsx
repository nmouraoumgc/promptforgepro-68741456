import { useTranslation } from 'react-i18next';
import { Construction, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function Learn() {
  const { t, i18n } = useTranslation();
  const lang = ((i18n.resolvedLanguage || i18n.language || 'pt').slice(0, 2) === 'en' ? 'en' : 'pt') as 'pt' | 'en';

  const content = {
    pt: {
      title: 'Secção Learn',
      subtitle: 'Em breve',
      message: 'Estamos a preparar conteúdo educativo de qualidade para te ajudar a dominar a arte dos prompts.',
    },
    en: {
      title: 'Learn Section',
      subtitle: 'Coming Soon',
      message: 'We\'re preparing quality educational content to help you master the art of prompts.',
    },
  };

  const c = content[lang];

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
              <Construction className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">{c.title}</h1>
            <div className="flex items-center gap-2 text-primary font-medium mb-4">
              <Clock className="h-4 w-4" />
              <span>{c.subtitle}</span>
            </div>
            <p className="text-muted-foreground max-w-sm">
              {c.message}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
