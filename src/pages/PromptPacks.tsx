import { useState } from 'react';
import { Package, Crown, Sparkles, Eye, ChevronDown, ChevronUp, Zap, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlanStore } from '@/stores/planStore';
import { UpgradePrompt } from '@/components/gating/FeatureGate';

const packs = [
  { 
    name: 'TikTok Viral', 
    description: 'Scripts e hooks para vídeos virais', 
    count: 15, 
    icon: '🎬', 
    premium: false,
    benefit: 'Criado para maximizar retenção nos primeiros 3 segundos',
    examplePrompt: 'Cria um hook para TikTok sobre [tema] que comece com uma pergunta provocadora e mantenha o espectador até ao fim...',
    beforeAfter: {
      before: 'Faz um vídeo sobre fitness',
      after: 'Hook: "Sabes porque 90% das pessoas desistem do ginásio?" + Revelação surpreendente + CTA para seguir',
    }
  },
  { 
    name: 'Instagram Reels', 
    description: 'Legendas e CTAs que convertem', 
    count: 20, 
    icon: '📱', 
    premium: false,
    benefit: 'Otimizado para o algoritmo do Instagram com CTAs que geram engagement',
    examplePrompt: 'Gera uma legenda para Reel sobre [tema] com hook emocional, storytelling de 3 linhas e CTA claro...',
    beforeAfter: {
      before: 'Legenda para post de viagem',
      after: 'Hook emocional + 3 pontos de storytelling + "Guarda este post" CTA + 5 hashtags estratégicas',
    }
  },
  { 
    name: 'Midjourney Pro', 
    description: 'Prompts fotorealistas avançados', 
    count: 25, 
    icon: '🎨', 
    premium: true,
    benefit: 'Domina parâmetros avançados para resultados cinematográficos',
    examplePrompt: 'Portrait of [subject], shot on Hasselblad, 85mm f/1.4, golden hour lighting, film grain...',
    beforeAfter: {
      before: 'Uma pessoa a sorrir',
      after: 'Cinematic portrait, shallow DOF, rim lighting, 8K, photorealistic, award-winning photography',
    }
  },
  { 
    name: 'Email Marketing', 
    description: 'Emails de vendas que abrem', 
    count: 12, 
    icon: '✉️', 
    premium: false,
    benefit: 'Fórmulas testadas para aumentar taxas de abertura em 40%',
    examplePrompt: 'Cria um email de vendas com subject line curiosa, abertura personalizada, 3 benefícios e escassez...',
    beforeAfter: {
      before: 'Email sobre novo produto',
      after: 'Subject: "[Nome], isto vai mudar..." + Personalização + Benefícios + Urgência + PS irresistível',
    }
  },
  { 
    name: 'Código Boilerplate', 
    description: 'Templates para programadores', 
    count: 30, 
    icon: '💻', 
    premium: true,
    benefit: 'Código limpo, comentado e pronto para produção',
    examplePrompt: 'Cria um componente React com TypeScript para [funcionalidade], incluindo error handling, loading states e testes...',
    beforeAfter: {
      before: 'Faz um formulário de login',
      after: 'Componente tipado + Validação Zod + Error boundaries + Loading skeleton + Testes unitários',
    }
  },
  { 
    name: 'LinkedIn Growth', 
    description: 'Posts que geram engagement', 
    count: 18, 
    icon: '💼', 
    premium: false,
    benefit: 'Estruturas virais que aumentam visibilidade e conexões',
    examplePrompt: 'Cria um post LinkedIn sobre [tema] com hook controverso, história pessoal e call-to-action para comentários...',
    beforeAfter: {
      before: 'Post sobre carreira',
      after: 'Hook "Fui despedido e..." + 5 lições numeradas + Pergunta para engagement + Formatação mobile-first',
    }
  },
];

export default function PromptPacks() {
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<typeof packs[0] | null>(null);
  const { canAccess, setPlan } = usePlanStore();
  const canAccessPacks = canAccess('canAccessPromptPacks');

  // Gate all packs for non-premium users
  if (!canAccessPacks) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Prompt Packs</h1>
          <p className="text-muted-foreground">
            Packs temáticos com prompts testados e otimizados para resultados profissionais
          </p>
        </div>

        {/* Preview grid - blurred */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packs.slice(0, 3).map((pack, i) => (
            <Card 
              key={i} 
              className="relative overflow-hidden opacity-60"
            >
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                <div className="text-center p-4">
                  <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">Premium</p>
                </div>
              </div>
              <CardHeader>
                <div className="text-4xl mb-2">{pack.icon}</div>
                <CardTitle>{pack.name}</CardTitle>
                <CardDescription>{pack.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{pack.count} prompts</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upgrade CTA */}
        <Card className="max-w-lg mx-auto">
          <UpgradePrompt 
            feature="premium"
            title="Acede a Prompt Packs Profissionais"
            description="Desbloqueia packs temáticos com prompts testados para TikTok, Instagram, Midjourney, Email e mais."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Prompt Packs</h1>
        <p className="text-muted-foreground">
          Packs temáticos com prompts testados e otimizados para resultados profissionais
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packs.map((pack, i) => (
          <Card 
            key={i} 
            className="group hover:border-primary/50 transition-all relative overflow-hidden"
          >
            {pack.premium && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-warning text-warning-foreground">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </div>
            )}
            <CardHeader>
              <div className="text-4xl mb-2">{pack.icon}</div>
              <CardTitle>{pack.name}</CardTitle>
              <CardDescription>{pack.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Benefit highlight */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs text-primary flex items-start gap-2">
                  <Zap className="h-3 w-3 mt-0.5 shrink-0" />
                  {pack.benefit}
                </p>
              </div>

              {/* Expandable example */}
              <div 
                className="cursor-pointer"
                onClick={() => setExpandedPack(expandedPack === pack.name ? null : pack.name)}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ver exemplo</span>
                  {expandedPack === pack.name ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                
                <AnimatePresence>
                  {expandedPack === pack.name && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2"
                    >
                      <p className="text-xs font-mono bg-muted/50 p-2 rounded line-clamp-3">
                        {pack.examplePrompt}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">{pack.count} prompts</span>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedPack(pack)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                  >
                    Explorar Pack
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedPack} onOpenChange={() => setSelectedPack(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-3xl">{selectedPack?.icon}</span>
              {selectedPack?.name}
            </DialogTitle>
            <DialogDescription>{selectedPack?.description}</DialogDescription>
          </DialogHeader>

          {selectedPack && (
            <div className="space-y-4 mt-4">
              {/* Benefit */}
              <div className="rounded-lg bg-success/10 border border-success/20 p-4">
                <p className="text-sm font-medium text-success flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Benefício principal
                </p>
                <p className="text-sm mt-1">{selectedPack.benefit}</p>
              </div>

              {/* Before / After */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Antes vs Depois</p>
                <div className="grid gap-3">
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                    <p className="text-xs font-medium text-destructive mb-1">❌ Sem o pack</p>
                    <p className="text-sm text-muted-foreground">{selectedPack.beforeAfter.before}</p>
                  </div>
                  <div className="rounded-lg bg-success/10 border border-success/20 p-3">
                    <p className="text-xs font-medium text-success mb-1">✓ Com o pack</p>
                    <p className="text-sm">{selectedPack.beforeAfter.after}</p>
                  </div>
                </div>
              </div>

              {/* Example prompt */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Exemplo de prompt incluído</p>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-mono">{selectedPack.examplePrompt}</p>
                </div>
              </div>

              {/* CTA */}
              <Button className="w-full" size="lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Aceder ao Pack ({selectedPack.count} prompts)
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
