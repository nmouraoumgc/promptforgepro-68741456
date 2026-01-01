import { useState } from 'react';
import { Lock, Copy, Check, Play, MessageSquare, Clock, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlanStore } from '@/stores/planStore';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface PackPrompt {
  id: string;
  title: string;
  description: string;
  content: string;
  variables: string[];
}

const categories = [
  { id: 'hooks', label: 'Hooks', icon: Zap, description: 'Primeiros 3 segundos' },
  { id: 'structure', label: 'Estrutura', icon: Play, description: 'Formato do vídeo' },
  { id: 'scripts', label: 'Scripts', icon: MessageSquare, description: 'Prontos a usar' },
  { id: 'cta', label: 'CTA & Retenção', icon: Clock, description: 'Fechar com impacto' },
];

const packPrompts: Record<string, PackPrompt[]> = {
  hooks: [
    {
      id: 'hook-choque',
      title: 'Hook de choque controlado',
      description: 'Hooks curtos para parar o scroll nos primeiros 3 segundos',
      content: `Cria 5 hooks curtos para um vídeo de TikTok sobre {{tema}}, pensados para parar o scroll nos primeiros 3 segundos.

Regras:
- Começa cada hook com uma frase forte ou inesperada
- Usa linguagem simples e direta
- Não reveles tudo no início
- Fala para {{publico_alvo}}

Formato:
Lista numerada, uma frase por hook.`,
      variables: ['tema', 'publico_alvo'],
    },
    {
      id: 'hook-promessa',
      title: 'Hook com promessa clara',
      description: 'Hooks com benefício claro e específico',
      content: `Cria 5 hooks para um vídeo de TikTok onde prometes um benefício claro relacionado com {{tema}}.

Regras:
- O benefício tem de ser específico
- Evita frases vagas
- Usa tom {{tom}}

Formato:
Lista curta, pronta a ser lida em voz alta.`,
      variables: ['tema', 'tom'],
    },
    {
      id: 'hook-curiosidade',
      title: 'Hook de curiosidade',
      description: 'Hooks que fazem o espectador querer saber mais',
      content: `Cria 5 hooks baseados em curiosidade para um vídeo de TikTok sobre {{tema}}.

Regras:
- Faz o espectador querer saber "o resto"
- Usa perguntas ou afirmações incompletas
- Não uses clickbait óbvio

Formato:
5 frases curtas.`,
      variables: ['tema'],
    },
  ],
  structure: [
    {
      id: 'estrutura-classica',
      title: 'Estrutura clássica TikTok',
      description: 'Hook → Desenvolvimento → Fecho',
      content: `Cria uma estrutura completa para um vídeo de TikTok sobre {{tema}}.

Inclui:
1. Hook (até 3 segundos)
2. Desenvolvimento do conteúdo
3. Fecho com mensagem final clara

Regras:
- Linguagem simples
- Ritmo rápido
- Fala para {{publico_alvo}}

Formato:
Texto dividido por secções.`,
      variables: ['tema', 'publico_alvo'],
    },
    {
      id: 'estrutura-educativa',
      title: 'Estrutura educativa curta',
      description: 'Vídeo educativo até 30 segundos',
      content: `Cria uma estrutura de vídeo educativo curto (até 30 segundos) para TikTok sobre {{tema}}.

Objetivo:
Ensinar algo útil de forma simples.

Inclui:
- Hook
- 2 a 3 pontos principais
- Fecho claro

Tom: {{tom}}`,
      variables: ['tema', 'tom'],
    },
    {
      id: 'estrutura-storytelling',
      title: 'Estrutura storytelling',
      description: 'Micro-história com conflito e resolução',
      content: `Cria uma estrutura de storytelling curto para um vídeo de TikTok sobre {{tema}}.

Inclui:
- Situação inicial
- Conflito ou desafio
- Resolução ou aprendizagem

Regras:
- Frases curtas
- Linguagem natural
- Ritmo rápido`,
      variables: ['tema'],
    },
  ],
  scripts: [
    {
      id: 'script-educativo',
      title: 'Script educativo',
      description: 'Guião pronto para vídeo educativo',
      content: `Escreve um script pronto a gravar para um vídeo educativo de TikTok sobre {{tema}}.

Regras:
- Frases curtas
- Linguagem falada
- Sem jargão técnico
- Duração aproximada: {{duracao}} segundos

Formato:
Texto contínuo, como se estivesse a falar para a câmara.`,
      variables: ['tema', 'duracao'],
    },
    {
      id: 'script-autoridade',
      title: 'Script de autoridade',
      description: 'Transmite confiança e credibilidade',
      content: `Escreve um script para um vídeo de TikTok onde assumes autoridade sobre {{tema}}.

Objetivo:
Transmitir confiança e credibilidade.

Regras:
- Tom seguro, mas acessível
- Evita arrogância
- Fala diretamente para {{publico_alvo}}`,
      variables: ['tema', 'publico_alvo'],
    },
    {
      id: 'script-pessoal',
      title: 'Script pessoal / marca pessoal',
      description: 'Partilha experiência ou opinião autêntica',
      content: `Escreve um script pessoal para TikTok sobre {{tema}}, como se estivesses a partilhar uma experiência ou opinião.

Regras:
- Tom humano e natural
- Linguagem simples
- Não soar a discurso preparado`,
      variables: ['tema'],
    },
  ],
  cta: [
    {
      id: 'cta-comentarios',
      title: 'CTA para comentários',
      description: 'Incentiva engagement nos comentários',
      content: `Cria 3 formas diferentes de terminar um vídeo de TikTok sobre {{tema}} incentivando comentários.

Regras:
- Perguntas simples
- Fáceis de responder
- Naturais no contexto do vídeo`,
      variables: ['tema'],
    },
    {
      id: 'cta-retencao',
      title: 'CTA para retenção',
      description: 'Incentiva ver até ao fim ou seguir',
      content: `Cria 3 frases de fecho para um vídeo de TikTok sobre {{tema}} que incentivem o espectador a ver até ao fim ou a seguir a conta.

Regras:
- Linguagem direta
- Sem pedir "segue-me" de forma genérica`,
      variables: ['tema'],
    },
    {
      id: 'cta-final',
      title: 'CTA final forte',
      description: 'Fecho curto e impactante',
      content: `Cria um fecho final curto e forte para um vídeo de TikTok sobre {{tema}}.

Objetivo:
Deixar uma ideia clara na cabeça do espectador.

Formato:
1 frase impactante.`,
      variables: ['tema'],
    },
  ],
};

export default function TikTokPack() {
  const { canAccess, setPlan } = usePlanStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const { toast } = useToast();
  const hasAccess = canAccess('canAccessPromptPacks');

  const copyPrompt = (prompt: PackPrompt) => {
    navigator.clipboard.writeText(prompt.content);
    setCopiedId(prompt.id);
    toast({ title: 'Copiado!', description: 'Prompt copiado para a área de transferência' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Non-premium view
  if (!hasAccess) {
    return (
      <div className="p-6 md:p-8 animate-fade-in">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
              <Lock className="h-3 w-3" />
              Pack Premium
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">🎬 TikTok Viral Prompt Pack</h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Prompts profissionais para vídeos que prendem atenção.
            </p>
          </header>

          {/* Preview */}
          <div className="grid gap-6 mb-12">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">O que inclui este pack</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {categories.map((cat) => (
                    <div key={cat.id} className="text-center p-4 rounded-lg bg-muted/30">
                      <cat.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
                      <p className="font-medium text-sm">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground mt-6">
                  12 prompts profissionais • Variáveis personalizáveis • Português (PT)
                </p>
              </CardContent>
            </Card>

            {/* Blurred preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                <div className="text-center p-6">
                  <Lock className="h-8 w-8 text-primary mx-auto mb-3" />
                  <p className="font-semibold mb-1">Conteúdo Premium</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Desbloqueia acesso a todos os 12 prompts
                  </p>
                  <Button onClick={() => setPlan('premium')}>
                    Desbloquear com Premium
                  </Button>
                </div>
              </div>
              <Card className="opacity-40">
                <CardHeader>
                  <CardTitle className="text-base">Hook de Curiosidade</CardTitle>
                  <CardDescription>Cria uma abertura que desperta curiosidade</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted/50 p-3 rounded-lg line-clamp-4">
                    Cria um hook de 3 segundos para TikTok...
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Premium view
  return (
    <div className="p-6 md:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <Badge className="mb-4">Premium Pack</Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">🎬 TikTok Viral Prompt Pack</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Prompts profissionais para vídeos que prendem atenção. Estrutura vídeos com maior retenção, impacto e clareza.
          </p>
        </header>

        {/* Categories Tabs */}
        <Tabs defaultValue="hooks" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-lg mx-auto">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs md:text-sm">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <cat.icon className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-semibold">{cat.label}</h2>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                </div>
              </div>

              {packPrompts[cat.id].map((prompt) => (
                <Card 
                  key={prompt.id} 
                  className="overflow-hidden bg-gradient-to-b from-card to-card/80 border-border/40 hover:border-border/60 transition-all duration-200 hover:shadow-sm"
                >
                  <CardHeader 
                    className="cursor-pointer transition-colors active:bg-muted/20"
                    onClick={() => setExpandedPrompt(expandedPrompt === prompt.id ? null : prompt.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <CardTitle className="text-[15px] font-semibold text-foreground leading-tight">
                          {prompt.title}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground/80">
                          {prompt.description}
                        </CardDescription>
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {prompt.variables.map((v) => (
                            <span 
                              key={v} 
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary/90 border border-primary/15"
                            >
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center pt-0.5">
                        <div className={`p-1.5 rounded-md transition-colors ${expandedPrompt === prompt.id ? 'bg-muted/50' : 'hover:bg-muted/30'}`}>
                          {expandedPrompt === prompt.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <AnimatePresence>
                    {expandedPrompt === prompt.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                      >
                        <CardContent className="pt-0 space-y-4">
                          <div className="bg-muted/30 border border-border/30 rounded-lg p-4">
                            <pre className="text-sm whitespace-pre-wrap font-mono text-foreground/85 leading-relaxed overflow-x-auto">
                              {prompt.content}
                            </pre>
                          </div>
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              copyPrompt(prompt);
                            }}
                            className="w-full transition-all duration-150 active:scale-[0.98]"
                            variant={copiedId === prompt.id ? "secondary" : "default"}
                          >
                            {copiedId === prompt.id ? (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Prompt
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Footer */}
        <footer className="text-center mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            12 prompts • 4 categorias • Variáveis personalizáveis
          </p>
        </footer>
      </div>
    </div>
  );
}
