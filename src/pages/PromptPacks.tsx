import { motion } from 'framer-motion';
import { Video, TrendingUp, Zap, Lightbulb, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PackCard } from '@/components/packs';
import { PACKS, getPacksByCategory } from '@/data/packs';
import { OUTCOME_CATEGORIES, OutcomeCategory } from '@/types/packs';
import { usePlanStore } from '@/stores/planStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const categoryIcons: Record<OutcomeCategory, React.ComponentType<{ className?: string }>> = {
  content: Video,
  sales: TrendingUp,
  productivity: Zap,
  creativity: Lightbulb,
};

export default function PromptPacks() {
  const navigate = useNavigate();
  const { canAccess } = usePlanStore();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
  const hasAccess = canAccess('canAccessPromptPacks');

  // Group packs by outcome category
  const categories = Object.keys(OUTCOME_CATEGORIES) as OutcomeCategory[];
  const packsByCategory = categories.reduce((acc, cat) => {
    const packs = getPacksByCategory(cat);
    if (packs.length > 0) {
      acc[cat] = packs;
    }
    return acc;
  }, {} as Record<OutcomeCategory, typeof PACKS>);

  return (
    <div className="p-6 space-y-10 animate-fade-in">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl mx-auto"
      >
        <Badge className="mb-4 bg-primary/10 text-primary border-0">
          {isEnglish ? 'Profession Packs' : 'Packs por Profissão'}
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          {isEnglish ? 'Outcome Packs' : 'Packs de Resultados'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {isEnglish
            ? 'Sell outcomes, not prompts. Pick packs built for your profession and the real result you want.'
            : 'Venda resultados, não prompts. Escolha packs criados para a sua profissão e para o resultado real que você quer.'}
        </p>
      </motion.div>

      {/* Value Proposition */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto"
      >
        {[
          { icon: Zap, label: isEnglish ? 'Real Cases' : 'Casos Reais', desc: isEnglish ? 'Use-cases from each profession' : 'Casos de uso por profissão' },
          { icon: TrendingUp, label: isEnglish ? 'Result Promise' : 'Promessa de Resultado', desc: isEnglish ? 'Each pack leads to a business outcome' : 'Cada pack aponta para um resultado de negócio' },
          { icon: Lightbulb, label: isEnglish ? 'Action-Ready' : 'Pronto para Ação', desc: isEnglish ? 'Use today with minimal adaptation' : 'Use hoje com pouca adaptação' },
        ].map(({ icon: Icon, label, desc }, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Packs by Category */}
      {Object.entries(packsByCategory).map(([category, packs], categoryIndex) => {
        const cat = category as OutcomeCategory;
        const catInfo = OUTCOME_CATEGORIES[cat];
        const IconComponent = categoryIcons[cat];

        return (
          <motion.section
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + categoryIndex * 0.05 }}
            className="space-y-4"
          >
            {/* Category Header */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <IconComponent className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {isEnglish
                    ? ({
                        content: 'Content Creation',
                        sales: 'Sales & Conversion',
                        productivity: 'Productivity',
                        creativity: 'Creativity',
                      } as Record<OutcomeCategory, string>)[cat]
                    : catInfo.label}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isEnglish
                    ? ({
                        content: 'Create engaging and high-performing content',
                        sales: 'Copy that converts visitors into customers',
                        productivity: 'Automate tasks and save time',
                        creativity: 'Generate unique and innovative ideas',
                      } as Record<OutcomeCategory, string>)[cat]
                    : catInfo.description}
                </p>
              </div>
            </div>

            {/* Pack Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packs.map((pack, i) => (
                <PackCard key={pack.id} pack={pack} index={i} />
              ))}
            </div>
          </motion.section>
        );
      })}

      {/* Bottom CTA for non-premium users */}
      {!hasAccess && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center py-8 px-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 max-w-2xl mx-auto"
        >
          <h3 className="text-xl font-bold text-foreground mb-2">
            {isEnglish ? 'Unlock all Packs' : 'Desbloqueia todos os Packs'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {isEnglish ? 'Lifetime access to all templates and future updates.' : 'Acesso vitalício a todos os templates e futuras atualizações.'}
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/pricing')}
            className="bg-primary hover:bg-primary/90"
          >
            {isEnglish ? 'View Premium Plan' : 'Ver Plano Premium'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
