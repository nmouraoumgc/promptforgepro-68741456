import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlanStore } from '@/stores/planStore';

interface TikTokPreviewProps {
  context?: 'builder' | 'optimizer' | 'packs';
  topic?: string;
}

const SESSION_KEY = 'tiktok-preview-shown';

// Check if content is related to TikTok/video/viral
export function shouldShowTikTokPreview(content: string): boolean {
  const keywords = [
    'tiktok', 'video', 'viral', 'hook', 'reels', 'retenção', 'scroll',
    'views', 'visualizações', 'engagement', 'algoritmo', 'conteúdo curto',
    'shorts', 'clip', 'clipe', 'vídeo curto'
  ];
  const lowerContent = content.toLowerCase();
  return keywords.some(keyword => lowerContent.includes(keyword));
}

export default function TikTokPreview({ context = 'builder', topic }: TikTokPreviewProps) {
  const { canAccess, setPlan } = usePlanStore();
  const [hasShownThisSession, setHasShownThisSession] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isPremium = canAccess('canAccessPromptPacks');

  useEffect(() => {
    // Check if already shown this session
    const shown = sessionStorage.getItem(SESSION_KEY);
    if (shown) {
      setHasShownThisSession(true);
    }
  }, []);

  useEffect(() => {
    // Only show for non-premium users, once per session
    if (!isPremium && !hasShownThisSession) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isPremium, hasShownThisSession]);

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setHasShownThisSession(true);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  // Sample output - only 2 hooks (limited preview)
  const sampleOutput = topic 
    ? `1. "${topic.charAt(0).toUpperCase() + topic.slice(1)}? A maioria das pessoas faz isto mal."\n\n2. "Vou contar-te o que ninguém te diz sobre ${topic.toLowerCase()}..."`
    : `1. "Sabes porque 90% das pessoas falham nisto?"\n\n2. "Vou mostrar-te algo que vai mudar a tua perspetiva..."`;

  return (
    <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent overflow-hidden">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Hook de choque controlado</p>
            <p className="text-xs text-muted-foreground">
              Do TikTok Viral Prompt Pack
            </p>
          </div>
        </div>

        {/* Sample output */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Resultado exemplo:</p>
          <div className="bg-muted/40 border border-border/40 rounded-lg p-3">
            <pre className="text-sm whitespace-pre-wrap font-sans text-foreground/90 leading-relaxed">
              {sampleOutput}
            </pre>
          </div>
        </div>

        {/* Premium lock message */}
        <div className="flex items-start gap-3 bg-card/50 border border-border/30 rounded-lg p-3">
          <Lock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Prompt Premium</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Este é um exemplo do TikTok Viral Prompt Pack.
              <br />
              O prompt original gera 5 hooks — aqui vês apenas 2.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setPlan('premium')}
            className="flex-1"
            size="sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Desbloquear com Premium
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            Agora não
          </Button>
        </div>

        {/* Link to pack */}
        <Link 
          to="/packs/tiktok" 
          className="block text-center text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Ver pack completo →
        </Link>
      </CardContent>
    </Card>
  );
}

// Inline preview for Prompt Packs page
export function TikTokPackPreviewInline() {
  const { canAccess, setPlan } = usePlanStore();
  const isPremium = canAccess('canAccessPromptPacks');

  if (isPremium) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎬</span>
          <div>
            <p className="font-semibold text-sm">Experimenta antes de desbloquear</p>
            <p className="text-xs text-muted-foreground">TikTok Viral Prompt Pack</p>
          </div>
        </div>

        {/* Mini sample */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
          <p className="text-xs text-muted-foreground mb-2">Hook de choque controlado:</p>
          <p className="text-sm italic text-foreground/80">
            "Sabes porque 90% das pessoas falham nisto?"
          </p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Versão limitada — 2 de 5 hooks
          </p>
        </div>

        <Button 
          onClick={() => setPlan('premium')}
          className="w-full"
          size="sm"
        >
          Desbloquear com Premium
        </Button>
      </CardContent>
    </Card>
  );
}
