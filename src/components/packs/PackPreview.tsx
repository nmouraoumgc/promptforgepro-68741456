import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pack, PackPrompt } from '@/types/packs';
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
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [generatedResults, setGeneratedResults] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Get all prompts with free preview
  const allPrompts: PackPrompt[] = Object.values(pack.prompts).flat();
  const freePreviewPrompts = allPrompts.filter(p => p.isFreePreview);
  const lockedPrompts = allPrompts.filter(p => !p.isFreePreview);
  const firstFreePrompt = freePreviewPrompts[0];

  const handleGenerate = async () => {
    if (!firstFreePrompt) return;
    
    setIsGenerating(true);
    
    // Simulate generation with placeholder results
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockResults = [
      `"E se eu te dissesse que ${variables[firstFreePrompt.variables[0]] || 'isto'} não funciona como pensas?"`,
      `"A maioria das pessoas sobre ${variables[firstFreePrompt.variables[0]] || 'este tema'} está completamente errada..."`,
    ];
    
    setGeneratedResults(mockResults);
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
      {/* Promise Section */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-foreground">{pack.promise}</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">{pack.description}</p>
        <Badge variant="secondary" className="text-sm">
          Para {pack.audience}
        </Badge>
      </div>

      {/* Benefits */}
      <Card className="p-4 bg-muted/30 border-border/50">
        <h3 className="font-semibold text-sm text-foreground mb-3">O que vais conseguir:</h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {pack.benefits.map((benefit, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Interactive Preview */}
      {firstFreePrompt && !hasAccess && (
        <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Badge className="bg-primary/10 text-primary border-0 mb-2">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Preview Gratuito
                </Badge>
                <h4 className="font-semibold text-foreground">{firstFreePrompt.title}</h4>
                <p className="text-sm text-muted-foreground">{firstFreePrompt.description}</p>
              </div>
            </div>

            {/* Variable Input */}
            {firstFreePrompt.variables.map((variable) => (
              <div key={variable}>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  {variable.charAt(0).toUpperCase() + variable.slice(1)}
                </label>
                <Input
                  placeholder={`Ex: ${variable === 'tema' ? 'finanças pessoais' : 'descreve aqui...'}`}
                  value={variables[variable] || ''}
                  onChange={(e) => setVariables({ ...variables, [variable]: e.target.value })}
                  disabled={hasGenerated}
                />
              </div>
            ))}

            {/* Generate Button or Results */}
            {!hasGenerated ? (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !variables[firstFreePrompt.variables[0]]}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="mr-2"
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.div>
                    A gerar...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar {pack.previewLimit} Exemplos Grátis
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                {/* Generated Results */}
                {generatedResults.map((result, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 bg-background rounded-lg border border-border"
                  >
                    <p className="text-sm text-foreground font-medium">{result}</p>
                  </motion.div>
                ))}

                {/* Locked Results Preview */}
                <div className="relative">
                  <div className="space-y-2 opacity-50 blur-[2px]">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-lg border border-border/50">
                        <div className="h-4 bg-muted-foreground/20 rounded w-full" />
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
                    <Lock className="h-5 w-5 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-foreground">+{pack.totalPrompts - pack.previewLimit} resultados premium</p>
                    <p className="text-xs text-muted-foreground">Inclui variações avançadas e templates exclusivos</p>
                  </div>
                </div>

                {/* Lock Message */}
                <p className="text-center text-sm text-muted-foreground">
                  Preview limitado • Já experimentaste a versão gratuita
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Locked Content Summary */}
      <Card className="p-4 border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">{pack.totalPrompts} templates incluídos</p>
            <p className="text-sm text-muted-foreground">
              {pack.categories.length} categorias: {pack.categories.map(c => c.label).join(', ')}
            </p>
          </div>
          {!hasAccess && (
            <Badge variant="outline" className="border-primary/30 text-primary">
              <Lock className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          )}
        </div>
      </Card>

      {/* Single CTA */}
      {!hasAccess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            onClick={handleUnlock}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Desbloquear Pack Completo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Pagamento único • Acesso vitalício • Atualizações incluídas
          </p>
        </motion.div>
      )}
    </div>
  );
}
