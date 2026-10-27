import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Check,
  Lock, 
  Zap, 
  Layout, 
  FileText, 
  MousePointer,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlanStore } from '@/stores/planStore';
import { usePacks } from '@/data/packsDb';
import { PackPreview } from '@/components/packs';
import { TemplateFiller } from '@/components/templates/TemplateFiller';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Layout,
  FileText,
  MousePointer,
};

export default function PackDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { canAccess } = usePlanStore();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
  const hasAccess = canAccess('canAccessPromptPacks');
  
  const { packs, isLoading: packsLoading } = usePacks(isEnglish);
  const pack = packs.find((p) => p.slug === (slug || ''));
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Initialize active category when pack loads
  // (Re)select the first category when none is set or the loaded catalogue has different category ids.
  if (pack && pack.categories.length > 0 && !pack.categories.some((c) => c.id === activeCategory)) {
    setActiveCategory(pack.categories[0].id);
  }

  if (!pack && packsLoading) {
    return <div className="p-6 text-center text-muted-foreground">{isEnglish ? 'Loading…' : 'A carregar…'}</div>;
  }

  if (!pack) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">{isEnglish ? 'Pack not found' : 'Pack não encontrado'}</p>
        <Button variant="ghost" onClick={() => navigate('/packs')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isEnglish ? 'Back to Packs' : 'Voltar aos Packs'}
        </Button>
      </div>
    );
  }


  const currentPrompts = pack.prompts[activeCategory] || [];

  // Show preview for non-premium users
  if (!hasAccess && pack.isPremium) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/packs')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isEnglish ? 'All Packs' : 'Todos os Packs'}
        </Button>

        {/* Pack Preview Component */}
        <PackPreview pack={pack} />
      </div>
    );
  }

  // Full access view
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/packs')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isEnglish ? 'All Packs' : 'Todos os Packs'}
        </Button>
        <Badge className="bg-primary/10 text-primary border-0">
          <Sparkles className="h-3 w-3 mr-1" />
          {pack.totalPrompts} Templates
        </Badge>
      </div>

      {/* Pack Info */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{pack.name}</h1>
        <p className="text-lg text-primary font-medium">{pack.promise}</p>
        <p className="text-muted-foreground">{pack.description}</p>
      </div>

      {/* Benefits */}
      <Card className="p-4 bg-muted/30 border-border/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {pack.benefits.map((benefit, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-muted/50">
          {pack.categories.map((cat) => {
            const IconComponent = categoryIcons[cat.icon] || FileText;
            return (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="flex items-center gap-1.5 whitespace-nowrap data-[state=active]:bg-background"
              >
                <IconComponent className="h-3.5 w-3.5" />
                {cat.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {pack.categories.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {/* Category description */}
                <p className="text-sm text-muted-foreground mb-4">{cat.description}</p>

                {/* Prompt Cards */}
                {(pack.prompts[cat.id] || []).map((prompt, i) => (
                  <motion.div
                    key={prompt.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="p-4 hover:border-primary/30 transition-all">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">{prompt.title}</h3>
                            {prompt.isFreePreview && (
                              <Badge variant="secondary" className="text-xs">
                                {isEnglish ? 'Free' : 'Grátis'}
                              </Badge>
                            )}
                          </div>
                          {prompt.description && <p className="text-sm text-muted-foreground">{prompt.description}</p>}
                        </div>
                        <TemplateFiller template={prompt.content} isEnglish={isEnglish} idPrefix={prompt.id} />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
