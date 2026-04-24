import { motion } from 'framer-motion';
import { Lock, ChevronRight, Play, PenTool, Youtube } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pack } from '@/types/packs';
import { usePlanStore } from '@/stores/planStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Play,
  PenTool,
  Youtube,
  Instagram: Play, // Fallback
};

interface PackCardProps {
  pack: Pack;
  index?: number;
}

export function PackCard({ pack, index = 0 }: PackCardProps) {
  const navigate = useNavigate();
  const { canAccess } = usePlanStore();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
  const hasAccess = canAccess('canAccessPromptPacks');
  
  const IconComponent = iconMap[pack.icon] || Play;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-300",
          "hover:shadow-lg hover:border-primary/30 cursor-pointer",
          "bg-card border-border"
        )}
        onClick={() => navigate(`/packs/${pack.slug}`)}
      >
        {/* Gradient Accent */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
          pack.gradient
        )} />
        
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className={cn(
              "p-2.5 rounded-lg bg-gradient-to-br",
              pack.gradient
            )}>
              <IconComponent className="h-5 w-5 text-white" />
            </div>
            
            {!hasAccess && pack.isPremium ? (
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            ) : pack.isPremium && hasAccess ? (
              <Badge className="bg-primary/10 text-primary border-0 text-xs">
                {isEnglish ? 'Unlocked' : 'Desbloqueado'}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {isEnglish ? 'Free Preview' : 'Preview Grátis'}
              </Badge>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
              {pack.name}
            </h3>
            <p className="text-sm font-medium text-primary/80">
              {pack.promise}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {pack.description}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              {pack.totalPrompts} templates
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
            >
              {hasAccess || !pack.isPremium ? (isEnglish ? 'Open Pack' : 'Abrir Pack') : (isEnglish ? 'View Preview' : 'Ver Preview')}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
