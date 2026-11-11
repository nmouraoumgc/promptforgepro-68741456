import { useState } from 'react';
import { TaskBrandSelector } from '@/components/brand/TaskBrandSelector';
import { TaskBrandContext, useLocalTaskBrand } from '@/components/brand/taskBrandContext';
import { motion } from 'framer-motion';
import { Zap, CheckCircle, Lock } from 'lucide-react';
import { TemplateFiller } from '@/components/templates/TemplateFiller';
import { RunPromptDialogButton } from '@/components/run/RunPrompt';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pack } from '@/types/packs';
import { usePlanStore } from '@/stores/planStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { localizeApiError } from '@/i18n/lang';
interface PackPreviewProps {
  pack: Pack;
  onUnlock?: () => void;
}

// Pack-specific copy configurations
const getPackCopy = (packSlug: string, isEnglish: boolean) => {
  const copyConfigs: Record<string, {
    inputLabel: string;
    inputPlaceholder: string;
    generateButton: string;
    generateMicrocopy: string;
    successMessage: string;
    lockedLabel: string;
    limitedViewNote: string;
    unlockBenefits: string[];
    limitTitle: string;
    limitSubtext: string;
    ctaMicrocopy: string;
    trustNote: string;
  }> = {
    instagram: {
      inputLabel: 'Tema do conteúdo',
      inputPlaceholder: 'Exemplos: negócio local, creator, marca pessoal',
      generateButton: '⚡ Gerar preview grátis',
      generateMicrocopy: 'Pré-visualização limitada. Sem cartão.',
      successMessage: '⚡ Preview gerado com sucesso',
      lockedLabel: '🔒 Conteúdo premium oculto',
      limitedViewNote: 'Esta é uma versão limitada do pack completo.',
      unlockBenefits: [
        'Estruturas completas prontas a usar',
        'Variações otimizadas para diferentes objetivos',
        'CTAs e exemplos aplicáveis imediatamente',
      ],
      limitTitle: '🔒 Limite gratuito atingido',
      limitSubtext: 'O pack completo oferece acesso integral e utilização ilimitada.',
      ctaMicrocopy: 'Inclui todo o conteúdo do Instagram Reels Prompt Pack.',
      trustNote: 'Criado para quem quer resultados consistentes, não apenas experimentar IA.',
    },
    tiktok: {
      inputLabel: 'Tema do vídeo',
      inputPlaceholder: 'Ex: Big Brother, fitness, dinheiro, produtividade',
      generateButton: '⚡ Gerar hooks grátis',
      generateMicrocopy: 'Estão disponíveis 2 hooks gratuitos. Sem cartão.',
      successMessage: '⚡ Hooks gerados com sucesso',
      lockedLabel: '🔒 Hook premium oculto',
      limitedViewNote: 'Esta pré-visualização apresenta 2 dos 5 hooks possíveis para este tema.',
      unlockBenefits: [
        '3 hooks com maior taxa de retenção',
        'Scripts completos prontos a gravar',
        'CTAs que aumentam comentários e follows',
      ],
      limitTitle: '🔒 Limite gratuito atingido',
      limitSubtext: 'O pack completo permite gerar hooks ilimitados e aceder a todo o conteúdo.',
      ctaMicrocopy: 'Inclui todos os hooks, scripts, estruturas e CTAs do TikTok Viral.',
      trustNote: 'Criado para quem quer publicar com consistência, não apenas "experimentar IA".',
    },
    youtube: {
      inputLabel: 'Tema do conteúdo',
      inputPlaceholder: 'Exemplos: títulos, thumbnails, retenção',
      generateButton: '⚡ Gerar preview grátis',
      generateMicrocopy: 'Pré-visualização limitada. Sem cartão.',
      successMessage: '⚡ Preview gerado com sucesso',
      lockedLabel: '🔒 Conteúdo premium oculto',
      limitedViewNote: 'Esta é uma versão limitada do pack completo.',
      unlockBenefits: [
        'Estruturas completas prontas a usar',
        'Variações otimizadas para diferentes objetivos',
        'CTAs e exemplos aplicáveis imediatamente',
      ],
      limitTitle: '🔒 Limite gratuito atingido',
      limitSubtext: 'O pack completo oferece acesso integral e utilização ilimitada.',
      ctaMicrocopy: 'Inclui todo o conteúdo do YouTube Growth Prompt Pack.',
      trustNote: 'Criado para quem quer resultados consistentes, não apenas experimentar IA.',
    },
    copywriting: {
      inputLabel: 'Tema do conteúdo',
      inputPlaceholder: 'Exemplos: landing pages, emails, anúncios',
      generateButton: '⚡ Gerar preview grátis',
      generateMicrocopy: 'Pré-visualização limitada. Sem cartão.',
      successMessage: '⚡ Preview gerado com sucesso',
      lockedLabel: '🔒 Conteúdo premium oculto',
      limitedViewNote: 'Esta é uma versão limitada do pack completo.',
      unlockBenefits: [
        'Estruturas completas prontas a usar',
        'Variações otimizadas para diferentes objetivos',
        'CTAs e exemplos aplicáveis imediatamente',
      ],
      limitTitle: '🔒 Limite gratuito atingido',
      limitSubtext: 'O pack completo oferece acesso integral e utilização ilimitada.',
      ctaMicrocopy: 'Inclui todo o conteúdo do Copywriting de Vendas Prompt Pack.',
      trustNote: 'Criado para quem quer resultados consistentes, não apenas experimentar IA.',
    },
  };

  // Default copy for other packs
  const defaultCopy = {
    inputLabel: 'Tema do conteúdo',
    inputPlaceholder: 'Ex.: tema ou nicho de atividade',
    generateButton: '⚡ Gerar preview grátis',
    generateMicrocopy: 'Pré-visualização limitada. Sem cartão.',
    successMessage: '⚡ Preview gerado com sucesso',
    lockedLabel: '🔒 Conteúdo premium oculto',
    limitedViewNote: 'Esta é uma versão limitada do pack completo.',
    unlockBenefits: [
      'Acesso a todo o conteúdo do pack',
      'Templates prontos a usar',
      'Atualizações futuras incluídas',
    ],
    limitTitle: '🔒 Limite gratuito atingido',
    limitSubtext: 'O pack completo oferece acesso integral e utilização ilimitada.',
    ctaMicrocopy: `Inclui todo o conteúdo do pack.`,
    trustNote: 'Criado para quem quer resultados consistentes, não apenas experimentar IA.',
  };

  if (!isEnglish) return copyConfigs[packSlug] || defaultCopy;

  const enOverrides: Record<string, Partial<typeof defaultCopy>> = {
    instagram: {
      inputLabel: 'Content topic',
      inputPlaceholder: 'Examples: local business, creator, personal brand',
      generateButton: '⚡ Generate free preview',
      generateMicrocopy: 'Limited preview. No card required.',
      successMessage: '⚡ Preview generated successfully',
      lockedLabel: '🔒 Premium content hidden',
      limitedViewNote: 'This is a limited preview of the full pack.',
      limitTitle: '🔒 Free limit reached',
      limitSubtext: 'Unlock this pack for full access and unlimited use.',
      ctaMicrocopy: 'Includes all content from the Instagram Reels Prompt Pack.',
      trustNote: 'Built for creators who want consistent outcomes, not just to experiment with AI.',
    },
    tiktok: {
      inputLabel: 'Video topic',
      inputPlaceholder: 'Ex: reality TV, fitness, money, productivity',
      generateButton: '⚡ Generate free hooks',
      generateMicrocopy: 'Generate 2 hooks for free. No card required.',
      successMessage: '⚡ Hooks generated successfully',
      lockedLabel: '🔒 Premium hook hidden',
      limitedViewNote: 'This preview shows 2 of the 5 possible hooks for this topic.',
      limitTitle: '🔒 Free limit reached',
      limitSubtext: 'Unlock this pack to generate unlimited hooks and access all content.',
      ctaMicrocopy: 'Includes all TikTok Viral hooks, scripts, structures and CTAs.',
      trustNote: 'Built for creators who want consistency, not just to "try AI".',
    },
    youtube: {
      inputLabel: 'Content topic',
      inputPlaceholder: 'Examples: titles, thumbnails, retention',
      generateButton: '⚡ Generate free preview',
      generateMicrocopy: 'Limited preview. No card required.',
      successMessage: '⚡ Preview generated successfully',
      lockedLabel: '🔒 Premium content hidden',
      limitedViewNote: 'This is a limited preview of the full pack.',
      limitTitle: '🔒 Free limit reached',
      limitSubtext: 'Unlock this pack for full access and unlimited use.',
      ctaMicrocopy: 'Includes all content from the YouTube Growth Prompt Pack.',
      trustNote: 'Built for creators who want consistent outcomes, not just to experiment with AI.',
    },
    copywriting: {
      inputLabel: 'Content topic',
      inputPlaceholder: 'Examples: landing pages, emails, ads',
      generateButton: '⚡ Generate free preview',
      generateMicrocopy: 'Limited preview. No card required.',
      successMessage: '⚡ Preview generated successfully',
      lockedLabel: '🔒 Premium content hidden',
      limitedViewNote: 'This is a limited preview of the full pack.',
      limitTitle: '🔒 Free limit reached',
      limitSubtext: 'Unlock this pack for full access and unlimited use.',
      ctaMicrocopy: 'Includes all content from the Sales Copywriting Prompt Pack.',
      trustNote: 'Built for creators who want consistent outcomes, not just to experiment with AI.',
    },
  };

  return {
    ...defaultCopy,
    ...copyConfigs[packSlug],
    ...{
      inputLabel: 'Content topic',
      inputPlaceholder: 'E.g. content topic or niche',
      generateButton: '⚡ Generate free preview',
      generateMicrocopy: 'Limited preview. No card required.',
      successMessage: '⚡ Preview generated successfully',
      lockedLabel: '🔒 Premium content hidden',
      limitedViewNote: 'This is a limited preview of the full pack.',
      unlockBenefits: [
        'Access to all pack content',
        'Ready-to-use templates',
        'Future updates included',
      ],
      limitTitle: '🔒 Free limit reached',
      limitSubtext: 'Unlock this pack for full access and unlimited use.',
      ctaMicrocopy: 'Includes all pack content.',
      trustNote: 'Built for creators who want consistent outcomes, not just to experiment with AI.',
    },
    ...(enOverrides[packSlug] || {}),
  };
};

export function PackPreview({ pack, onUnlock }: PackPreviewProps) {
  const navigate = useNavigate();
  const taskBrand = useLocalTaskBrand();
  const { toast } = useToast();
  const { canAccess } = usePlanStore();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
  const hasAccess = canAccess('canAccessPromptPacks');
  const [tema, setTema] = useState('');
  const [generatedContent, setGeneratedContent] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const copy = getPackCopy(pack.slug, isEnglish);
  const freePrompts = Object.values(pack.prompts).flat().filter((p) => p.isFreePreview);
  const lockedCount = Math.max(0, pack.totalPrompts - freePrompts.length);

  const handleGenerate = async () => {
    if (!tema.trim()) return;
    
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-pack-preview', {
        body: { 
          tema: tema.trim(), 
          packSlug: pack.slug,
          isPremium: hasAccess,
          language: isEnglish ? 'en' : 'pt',
          ...taskBrand.requestBrand,
        }
      });

      if (error) {
        console.error('Error generating preview:', error);
        toast({
          title: isEnglish ? 'Generation error' : 'Erro ao gerar',
          description: isEnglish ? 'Could not generate the content. Try again.' : 'Não foi possível gerar o conteúdo. Volte a tentar.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      if (data.error) {
        toast({
          title: isEnglish ? 'Error' : 'Erro',
          description: localizeApiError(data.error, isEnglish),
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      setGeneratedContent(data.results || []);
      setHasGenerated(true);
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: isEnglish ? 'Error' : 'Erro',
        description: isEnglish ? 'An unexpected error occurred. Try again.' : 'Ocorreu um erro inesperado. Volte a tentar.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUnlock = () => {
    if (onUnlock) {
      onUnlock();
    } else {
      navigate('/pricing');
    }
  };

  return (
    <TaskBrandContext.Provider value={taskBrand}><div className="space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{pack.name}</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {pack.promise}
        </p>
        <p className="text-sm text-muted-foreground/70 italic">
          {pack.description}
        </p>
      </div>

      {/* Free templates (public previews served by the DB; premium ones are never sent to this user) */}
      {!hasAccess && freePrompts.length > 0 && (
        <Card className="p-5 space-y-3" data-testid="free-templates">
          <h3 className="font-semibold text-lg text-foreground">
            {isEnglish ? 'Free templates from this pack' : 'Modelos grátis deste pack'}
          </h3>
          {freePrompts.map((p) => (
            <div key={p.id} className="p-3 rounded-lg border border-border bg-background space-y-3">
              <div>
                <p className="font-medium text-foreground">{p.title}</p>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
              </div>
              <TemplateFiller template={p.content} isEnglish={isEnglish} idPrefix={`free-${p.id}`} extraActions={(text, missing) => <RunPromptDialogButton prompt={text} disabled={missing > 0} />} />
            </div>
          ))}
          {lockedCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-muted/30 text-sm text-muted-foreground" data-testid="locked-templates">
              <Lock className="h-4 w-4" />
              {isEnglish ? `${lockedCount} more premium templates unlock with the full pack` : `Mais ${lockedCount} templates premium com o pack completo`}
            </div>
          )}
        </Card>
      )}

      {/* Interactive Preview Block */}
      {!hasAccess && (
        <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="space-y-4">
            {/* Preview Header */}
            <div>
              <h3 className="font-semibold text-lg text-foreground mb-1">
                {isEnglish ? 'Preview the content' : 'Pré-visualização dos conteúdos'}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {pack.name}
              </Badge>
            </div>

            {/* Input */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                {copy.inputLabel}
              </label>
              <Input
                placeholder={copy.inputPlaceholder}
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                disabled={hasGenerated}
              />
              <TaskBrandSelector className="pt-2" request={tema} />
            </div>

            {/* Generate Button or Results */}
            {!hasGenerated ? (
              <div className="space-y-2">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !tema.trim()}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="mr-2"
                      >
                        <Zap className="h-4 w-4" />
                      </motion.div>
                      {isEnglish ? 'Generating...' : 'A gerar...'}
                    </>
                  ) : (
                    <>{copy.generateButton}</>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {copy.generateMicrocopy}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Success Message */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-primary"
                >
                  <span className="text-sm font-medium">{copy.successMessage}</span>
                </motion.div>

                {/* Generated Content */}
                <div className="space-y-2">
                  {generatedContent.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-3 bg-background rounded-lg border border-border"
                    >
                      <p className="text-sm text-foreground font-medium">
                        <span className="text-muted-foreground mr-2">{i + 1}.</span>
                        {item}
                      </p>
                    </motion.div>
                  ))}

                  {/* Locked Content */}
                  {[3, 4, 5].map((num) => (
                    <div
                      key={num}
                      className="p-3 bg-muted/30 rounded-lg border border-border/50"
                    >
                      <span className="text-sm text-muted-foreground">{copy.lockedLabel}</span>
                    </div>
                  ))}
                </div>

                {/* Limited View Note */}
                <p className="text-center text-sm text-muted-foreground">
                  {copy.limitedViewNote}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Benefits Block - What you get when unlocking */}
      {!hasAccess && hasGenerated && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">{isEnglish ? 'The full pack includes:' : 'O pack completo inclui:'}</h4>
              <ul className="space-y-2">
                {copy.unlockBenefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Limit Reached State */}
      {!hasAccess && hasGenerated && (
        <Card className="p-4 border-border/50 bg-muted/30">
          <div>
            <p className="font-semibold text-foreground">{copy.limitTitle}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {copy.limitSubtext}
            </p>
          </div>
        </Card>
      )}

      {/* Single CTA */}
      {!hasAccess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 text-center"
        >
          <Button
            onClick={handleUnlock}
            size="lg"
            className="w-full max-w-sm mx-auto bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isEnglish ? '✨ Unlock full version' : '✨ Desbloquear versão completa'}
          </Button>
          <p className="text-xs text-muted-foreground">
            {copy.ctaMicrocopy}
          </p>
        </motion.div>
      )}

      {/* Trust Note */}
      {!hasAccess && (
        <p className="text-center text-xs text-muted-foreground/60 italic">
          {copy.trustNote}
        </p>
      )}
    </div></TaskBrandContext.Provider>
  );
}
