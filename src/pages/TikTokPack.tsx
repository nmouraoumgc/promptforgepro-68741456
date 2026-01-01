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
      id: 'hook-curiosity',
      title: 'Hook de Curiosidade',
      description: 'Cria uma abertura que desperta curiosidade imediata',
      content: `Cria um hook de 3 segundos para TikTok sobre {{tema}}.

[OBJETIVO]
Parar o scroll e gerar curiosidade instantânea.

[INSTRUÇÕES]
- Começa com uma pergunta provocadora OU facto surpreendente
- Tom: {{tom}} (ex: direto, misterioso, chocante)
- Público-alvo: {{publico}}
- Máximo 15 palavras

[FORMATO DO OUTPUT]
3 variações do hook, ordenadas por impacto.
Cada uma com explicação de 1 linha sobre o gatilho usado.`,
      variables: ['tema', 'tom', 'publico'],
    },
    {
      id: 'hook-controversy',
      title: 'Hook Controverso',
      description: 'Declaração ousada que gera reação imediata',
      content: `Gera um hook controverso (mas respeitoso) para TikTok sobre {{tema}}.

[OBJETIVO]
Provocar reação emocional nos primeiros 2-3 segundos.

[INSTRUÇÕES]
- Usa uma afirmação ousada que desafia o senso comum
- Evita ofensas ou desinformação
- Tom: confiante e direto
- Público: {{publico}}

[RESTRIÇÕES]
- Mantém-te factualmente correto
- Nada que possa ser cancelado

[OUTPUT]
2 opções de hook + 1 frase de transição para o conteúdo.`,
      variables: ['tema', 'publico'],
    },
    {
      id: 'hook-pattern-interrupt',
      title: 'Pattern Interrupt',
      description: 'Quebra o padrão esperado para captar atenção',
      content: `Cria um hook de "pattern interrupt" para TikTok sobre {{tema}}.

[CONTEXTO]
Pattern interrupt = algo inesperado que força o cérebro a prestar atenção.

[INSTRUÇÕES]
- Começa com algo visualmente ou verbalmente inesperado
- Pode ser: número específico, confissão, contradição
- Tom: {{tom}}
- Duração: 2-4 segundos falados

[EXEMPLOS DE ESTRUTURA]
- "Nunca devias fazer X... a menos que..."
- "Gastei 10.000€ para aprender isto de graça"
- "Toda a gente diz X. Está errado."

[OUTPUT]
3 hooks + sugestão de expressão facial/energia.`,
      variables: ['tema', 'tom'],
    },
  ],
  structure: [
    {
      id: 'structure-3act',
      title: 'Estrutura 3 Atos (30-60s)',
      description: 'Hook → Desenvolvimento → Fecho',
      content: `Estrutura um vídeo TikTok de 30-60 segundos sobre {{tema}}.

[ESTRUTURA OBRIGATÓRIA]
1. HOOK (0-3s): Captar atenção
2. CORPO (3-45s): Entregar valor
3. FECHO (45-60s): CTA claro

[INSTRUÇÕES]
- Hook: pergunta ou facto surpreendente
- Corpo: 3 pontos principais, ritmo rápido
- Fecho: ação específica (comentar, guardar, seguir)
- Tom: {{tom}}
- Público: {{publico}}

[OUTPUT]
Guião completo com marcações de tempo.
Sugestões de cortes visuais entre secções.`,
      variables: ['tema', 'tom', 'publico'],
    },
    {
      id: 'structure-listicle',
      title: 'Listicle Rápido (15-30s)',
      description: 'Lista numerada de alto impacto',
      content: `Cria um vídeo TikTok estilo lista sobre {{tema}}.

[FORMATO]
"X coisas que..." / "X erros que..." / "X formas de..."

[INSTRUÇÕES]
- Hook: número + promessa clara
- Itens: 3-5 pontos, máximo 5 segundos cada
- Transições rápidas entre pontos
- Último ponto = o mais forte
- Tom: {{tom}}

[OUTPUT]
- Hook de abertura
- Lista de {{numero}} itens com texto para cada
- Frase de fecho com CTA`,
      variables: ['tema', 'tom', 'numero'],
    },
    {
      id: 'structure-storytelling',
      title: 'Mini-Storytelling',
      description: 'História pessoal com lição',
      content: `Estrutura uma micro-história para TikTok sobre {{tema}}.

[FÓRMULA]
Situação → Conflito → Resolução → Lição

[INSTRUÇÕES]
- Situação (3s): contexto rápido
- Conflito (10s): o problema/desafio
- Resolução (10s): como resolveste
- Lição (5s): o takeaway universal
- Tom: {{tom}}, autêntico

[RESTRIÇÕES]
- Máximo 45 segundos total
- Fala na primeira pessoa
- Evita jargão

[OUTPUT]
Guião narrativo com pausas marcadas.`,
      variables: ['tema', 'tom'],
    },
  ],
  scripts: [
    {
      id: 'script-educational',
      title: 'Script Educativo',
      description: 'Ensina algo útil em menos de 1 minuto',
      content: `Escreve um guião educativo para TikTok sobre {{tema}}.

[OBJETIVO]
Ensinar {{publico}} a fazer/entender {{tema}} de forma clara e rápida.

[ESTRUTURA DO GUIÃO]
HOOK: "Vou ensinar-te a {{resultado}} em 30 segundos"
PASSO 1: [ação simples]
PASSO 2: [ação seguinte]
PASSO 3: [ação final]
FECHO: "Guarda isto e agradece-me depois"

[TOM]
{{tom}}, confiante, direto

[OUTPUT]
Guião palavra-por-palavra pronto para gravar.
Indicações de ritmo entre parênteses.`,
      variables: ['tema', 'publico', 'resultado', 'tom'],
    },
    {
      id: 'script-authority',
      title: 'Script de Autoridade',
      description: 'Posiciona-te como especialista',
      content: `Cria um guião que estabelece autoridade sobre {{tema}}.

[OBJETIVO]
Mostrar expertise sem parecer arrogante.

[ESTRUTURA]
1. Credencial subtil: "Depois de {{experiencia}}..."
2. Insight exclusivo: algo que a maioria não sabe
3. Prova social ou resultado
4. Oferta de valor: "Fica para mais..."

[TOM]
Confiante mas acessível. {{tom}}.

[RESTRIÇÕES]
- Não te gabares diretamente
- Mostra, não digas
- Máximo 45 segundos

[OUTPUT]
Guião completo + sugestão de thumbnail/primeiro frame.`,
      variables: ['tema', 'experiencia', 'tom'],
    },
    {
      id: 'script-personal-brand',
      title: 'Script Pessoal/Marca',
      description: 'Storytelling autêntico de marca',
      content: `Escreve um guião de storytelling pessoal para TikTok.

[CONTEXTO]
Tema: {{tema}}
Marca/Pessoa: {{marca}}
Objetivo: criar conexão emocional

[ESTRUTURA]
1. Momento vulnerável ou real
2. A jornada/transformação
3. Onde estás agora
4. Convite à comunidade

[TOM]
Autêntico, {{tom}}, sem filtros (mas estratégico)

[OUTPUT]
Guião de 30-45 segundos.
Marcações de emoção/expressão.
Sugestão de música ou som trending.`,
      variables: ['tema', 'marca', 'tom'],
    },
  ],
  cta: [
    {
      id: 'cta-comments',
      title: 'CTA para Comentários',
      description: 'Gera engagement nos comentários',
      content: `Cria CTAs para gerar comentários num vídeo sobre {{tema}}.

[OBJETIVO]
Maximizar comentários para boost de algoritmo.

[TIPOS DE CTA]
1. Pergunta polarizadora: "Concordas ou não?"
2. Escolha A/B: "Qual preferes: X ou Y?"
3. Desafio: "Aposto que não consegues..."
4. Confissão: "Comenta se já te aconteceu"

[INSTRUÇÕES]
- Gera 4 CTAs (um de cada tipo)
- Tom: {{tom}}
- Relacionados com {{tema}}

[OUTPUT]
4 frases de CTA prontas a usar.
Cada uma com emoji sugerido.`,
      variables: ['tema', 'tom'],
    },
    {
      id: 'cta-watch-time',
      title: 'Aumentar Watch Time',
      description: 'Técnicas para manter até ao fim',
      content: `Cria elementos para aumentar watch time num vídeo sobre {{tema}}.

[TÉCNICAS A USAR]
1. Open loop no início: "No final mostro..."
2. Teaser mid-roll: "Espera pelo ponto 3..."
3. Payoff final: recompensa por ficar

[INSTRUÇÕES]
- Gera frases para cada técnica
- Tom: {{tom}}
- Público: {{publico}}

[RESTRIÇÕES]
- Cumpre a promessa (não clickbait vazio)
- Natural, não forçado

[OUTPUT]
3 frases (uma por técnica) + onde inserir no vídeo.`,
      variables: ['tema', 'tom', 'publico'],
    },
    {
      id: 'cta-closing',
      title: 'Fechos Memoráveis',
      description: 'Últimas palavras que ficam',
      content: `Gera frases de fecho impactantes para vídeo sobre {{tema}}.

[OBJETIVO]
Deixar impressão duradoura + ação clara.

[ESTILOS DE FECHO]
1. Inspiracional: "Lembra-te..."
2. Direto: "Faz isto agora:"
3. Social proof: "Junta-te a X pessoas que..."
4. Misterioso: "No próximo vídeo..."

[INSTRUÇÕES]
- 4 opções de fecho (uma por estilo)
- Tom: {{tom}}
- Inclui CTA secundário (seguir, guardar, etc.)

[OUTPUT]
4 frases de fecho completas.
Sugestão de gesto ou expressão para cada.`,
      variables: ['tema', 'tom'],
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
                <Card key={prompt.id} className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedPrompt(expandedPrompt === prompt.id ? null : prompt.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{prompt.title}</CardTitle>
                        <CardDescription className="text-sm">{prompt.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {prompt.variables.map((v) => (
                            <Badge key={v} variant="outline" className="text-xs">
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                        </div>
                        {expandedPrompt === prompt.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <AnimatePresence>
                    {expandedPrompt === prompt.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CardContent className="pt-0 space-y-4">
                          <pre className="text-sm bg-muted/50 p-4 rounded-lg whitespace-pre-wrap font-mono overflow-x-auto">
                            {prompt.content}
                          </pre>
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              copyPrompt(prompt);
                            }}
                            className="w-full"
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
