import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Zap, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pack } from '@/types/packs';
import { usePlanStore } from '@/stores/planStore';
import { useNavigate } from 'react-router-dom';

interface PackPreviewProps {
  pack: Pack;
  onUnlock?: () => void;
}

// Pack-specific copy configurations
const getPackCopy = (packSlug: string) => {
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
      limitedViewNote: 'Estás a ver uma versão limitada do pack completo.',
      unlockBenefits: [
        'Estruturas completas prontas a usar',
        'Variações otimizadas para diferentes objetivos',
        'CTAs e exemplos aplicáveis imediatamente',
      ],
      limitTitle: '🔒 Limite gratuito atingido',
      limitSubtext: 'Desbloqueia o pack para acesso completo e uso ilimitado.',
      ctaMicrocopy: 'Inclui todo o conteúdo do Instagram Reels Prompt Pack.',
      trustNote: 'Criado para quem quer resultados consistentes, não apenas experimentar IA.',
    },
    tiktok: {
      inputLabel: 'Tema do vídeo',
      inputPlaceholder: 'Ex: Big Brother, fitness, dinheiro, produtividade',
      generateButton: '⚡ Gerar hooks grátis',
      generateMicrocopy: 'Gera 2 hooks gratuitamente. Sem cartão.',
      successMessage: '⚡ Hooks gerados com sucesso',
      lockedLabel: '🔒 Hook premium oculto',
      limitedViewNote: 'Estás a ver 2 de 5 hooks possíveis para este tema.',
      unlockBenefits: [
        '3 hooks com maior taxa de retenção',
        'Scripts completos prontos a gravar',
        'CTAs que aumentam comentários e follows',
      ],
      limitTitle: '🔒 Limite gratuito atingido',
      limitSubtext: 'Desbloqueia o pack para gerar hooks ilimitados e aceder a todo o conteúdo.',
      ctaMicrocopy: 'Inclui todos os hooks, scripts, estruturas e CTAs do TikTok Viral.',
      trustNote: 'Criado para quem quer publicar com consistência — não apenas "experimentar IA".',
    },
    youtube: {
      inputLabel: 'Tema do conteúdo',
      inputPlaceholder: 'Exemplos: títulos, thumbnails, retenção',
      generateButton: '⚡ Gerar preview grátis',
      generateMicrocopy: 'Pré-visualização limitada. Sem cartão.',
      successMessage: '⚡ Preview gerado com sucesso',
      lockedLabel: '🔒 Conteúdo premium oculto',
      limitedViewNote: 'Estás a ver uma versão limitada do pack completo.',
      unlockBenefits: [
        'Estruturas completas prontas a usar',
        'Variações otimizadas para diferentes objetivos',
        'CTAs e exemplos aplicáveis imediatamente',
      ],
      limitTitle: '🔒 Limite gratuito atingido',
      limitSubtext: 'Desbloqueia o pack para acesso completo e uso ilimitado.',
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
      limitedViewNote: 'Estás a ver uma versão limitada do pack completo.',
      unlockBenefits: [
        'Estruturas completas prontas a usar',
        'Variações otimizadas para diferentes objetivos',
        'CTAs e exemplos aplicáveis imediatamente',
      ],
      limitTitle: '🔒 Limite gratuito atingido',
      limitSubtext: 'Desbloqueia o pack para acesso completo e uso ilimitado.',
      ctaMicrocopy: 'Inclui todo o conteúdo do Copywriting de Vendas Prompt Pack.',
      trustNote: 'Criado para quem quer resultados consistentes, não apenas experimentar IA.',
    },
  };

  // Default copy for other packs
  const defaultCopy = {
    inputLabel: 'Tema do conteúdo',
    inputPlaceholder: 'Ex: o teu tema ou nicho',
    generateButton: '⚡ Gerar preview grátis',
    generateMicrocopy: 'Pré-visualização limitada. Sem cartão.',
    successMessage: '⚡ Preview gerado com sucesso',
    lockedLabel: '🔒 Conteúdo premium oculto',
    limitedViewNote: 'Estás a ver uma versão limitada do pack completo.',
    unlockBenefits: [
      'Acesso a todo o conteúdo do pack',
      'Templates prontos a usar',
      'Atualizações futuras incluídas',
    ],
    limitTitle: '🔒 Limite gratuito atingido',
    limitSubtext: 'Desbloqueia o pack para acesso completo e uso ilimitado.',
    ctaMicrocopy: `Inclui todo o conteúdo do pack.`,
    trustNote: 'Criado para quem quer resultados consistentes, não apenas experimentar IA.',
  };

  return copyConfigs[packSlug] || defaultCopy;
};

export function PackPreview({ pack, onUnlock }: PackPreviewProps) {
  const navigate = useNavigate();
  const { canAccess } = usePlanStore();
  const hasAccess = canAccess('canAccessPromptPacks');
  const [tema, setTema] = useState('');
  const [generatedContent, setGeneratedContent] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const copy = getPackCopy(pack.slug);

  const handleGenerate = async () => {
    if (!tema.trim()) return;
    
    setIsGenerating(true);
    
    // Simulate generation with themed results
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate pack-specific mock results
    let mockResults: string[];
    if (pack.slug === 'instagram') {
      mockResults = [
        `Reel educativo sobre ${tema}: "3 erros que estás a cometer..."`,
        `Hook de bastidores: "O que ninguém te mostra sobre ${tema}"`,
      ];
    } else if (pack.slug === 'youtube') {
      mockResults = [
        `Título de curiosidade: "O segredo de ${tema} que ninguém te conta"`,
        `Título SEO: "Como dominar ${tema} em 2024 (Guia Completo)"`,
      ];
    } else if (pack.slug === 'copywriting') {
      mockResults = [
        `Headline de benefício: "Descobre como ${tema} pode transformar o teu negócio"`,
        `Headline de curiosidade: "O erro fatal que está a custar vendas em ${tema}"`,
      ];
    } else {
      mockResults = [
        `${tema}: Aquele escândalo que ninguém esperava…`,
        `Revelado: O segredo mais chocante do ${tema}!`,
      ];
    }
    
    setGeneratedContent(mockResults);
    setHasGenerated(true);
    setIsGenerating(false);
  };

  const handleUnlock = () => {
    if (onUnlock) {
      onUnlock();
    } else {
      navigate('/pricing');
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Interactive Preview Block */}
      {!hasAccess && (
        <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="space-y-4">
            {/* Preview Header */}
            <div>
              <h3 className="font-semibold text-lg text-foreground mb-1">
                Experimenta antes de desbloquear
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
                      A gerar...
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
              <h4 className="font-semibold text-foreground">Ao desbloquear recebes:</h4>
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
            ✨ Desbloquear versão completa
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
    </div>
  );
}