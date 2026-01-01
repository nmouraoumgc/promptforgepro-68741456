import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Zap, Sparkles, AlertTriangle } from 'lucide-react';
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

export function PackPreview({ pack, onUnlock }: PackPreviewProps) {
  const navigate = useNavigate();
  const { canAccess } = usePlanStore();
  const hasAccess = canAccess('canAccessPromptPacks');
  const [tema, setTema] = useState('');
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = async () => {
    if (!tema.trim()) return;
    
    setIsGenerating(true);
    
    // Simulate generation with themed results
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockResults = [
      `${tema}: Aquele escândalo que ninguém esperava…`,
      `Revelado: O segredo mais chocante do ${tema}!`,
    ];
    
    setGeneratedHooks(mockResults);
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
          Estruturas testadas em conteúdo real — não prompts genéricos.
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
                Tema do vídeo
              </label>
              <Input
                placeholder="Ex: Big Brother, fitness, dinheiro, produtividade"
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
                    <>
                      ⚡ Gerar hooks grátis
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Gera 2 hooks gratuitamente. Sem cartão.
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
                  <span className="text-sm font-medium">⚡ Hooks gerados com sucesso</span>
                </motion.div>

                {/* Generated Hooks */}
                <div className="space-y-2">
                  {generatedHooks.map((hook, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-3 bg-background rounded-lg border border-border"
                    >
                      <p className="text-sm text-foreground font-medium">
                        <span className="text-muted-foreground mr-2">{i + 1}.</span>
                        {hook}
                      </p>
                    </motion.div>
                  ))}

                  {/* Locked Hooks */}
                  {[3, 4, 5].map((num) => (
                    <div
                      key={num}
                      className="p-3 bg-muted/30 rounded-lg border border-border/50"
                    >
                      <span className="text-sm text-muted-foreground">🔒 Hook premium oculto</span>
                    </div>
                  ))}
                </div>

                {/* Counter */}
                <p className="text-center text-sm text-muted-foreground">
                  Estás a ver 2 de 5 hooks possíveis para este tema.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Loss Aversion Block */}
      {!hasAccess && hasGenerated && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4 border-destructive/20 bg-destructive/5">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground mb-2">Estás a perder:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 3 hooks com maior taxa de retenção</li>
                  <li>• Scripts completos prontos a gravar</li>
                  <li>• CTAs que aumentam comentários e follows</li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Limit Reached State */}
      {!hasAccess && hasGenerated && (
        <Card className="p-4 border-border/50 bg-muted/30">
          <div>
            <p className="font-semibold text-foreground">🔒 Limite gratuito atingido</p>
            <p className="text-sm text-muted-foreground mt-1">
              Desbloqueia o pack para gerar hooks ilimitados e aceder a todo o conteúdo.
            </p>
          </div>
        </Card>
      )}

      {/* Single CTA */}
      {!hasAccess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <Button
            onClick={handleUnlock}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            ✨ Desbloquear versão completa
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Inclui todos os hooks, scripts, estruturas e CTAs do {pack.name}.
          </p>
        </motion.div>
      )}

      {/* Trust Note */}
      {!hasAccess && (
        <p className="text-center text-xs text-muted-foreground/60 italic">
          Criado para quem quer publicar com consistência — não apenas "experimentar IA".
        </p>
      )}
    </div>
  );
}
