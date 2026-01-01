import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles, Zap, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlanStore } from '@/stores/planStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    const shown = sessionStorage.getItem(SESSION_KEY);
    if (shown) {
      setHasShownThisSession(true);
    }
  }, []);

  useEffect(() => {
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

  return (
    <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Experimenta o TikTok Pack</p>
            <p className="text-xs text-muted-foreground">
              Gera hooks profissionais gratuitamente
            </p>
          </div>
        </div>

        <InteractiveHookGenerator onUpgrade={() => setPlan('premium')} />

        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleDismiss}
          className="w-full text-muted-foreground hover:text-foreground text-xs"
        >
          Fechar preview
        </Button>

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

// Interactive Hook Generator Component
function InteractiveHookGenerator({ onUpgrade }: { onUpgrade: () => void }) {
  const [tema, setTema] = useState('');
  const [hooks, setHooks] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const { toast } = useToast();

  const generateHooks = async () => {
    if (!tema.trim()) {
      toast({ 
        title: 'Tema obrigatório', 
        description: 'Escreve o tema do teu vídeo',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setHooks(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-hooks', {
        body: { tema, isPremium: false }
      });

      if (error) throw error;

      if (data.error) {
        toast({ 
          title: 'Erro', 
          description: data.error,
          variant: 'destructive'
        });
        return;
      }

      setHooks(data.hooks);
      setHasGenerated(true);
    } catch (error) {
      console.error('Error generating hooks:', error);
      toast({ 
        title: 'Erro ao gerar hooks', 
        description: 'Tenta novamente em alguns segundos.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Tema do vídeo
        </label>
        <Input
          placeholder="Ex: produtividade, fitness, finanças..."
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isLoading && generateHooks()}
          className="text-sm h-10"
          disabled={isLoading}
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-4 text-primary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">A gerar hooks…</span>
        </div>
      )}

      {/* Generated Output - 5 hooks list with 2 visible, 3 locked */}
      {hooks && !isLoading && (
        <div className="space-y-4 animate-fade-in">
          {/* Success indicator */}
          <div className="flex items-center gap-2 text-primary">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-medium">Hooks gerados com sucesso</span>
          </div>

          {/* All 5 hooks - 2 visible, 3 locked */}
          <div className="space-y-2">
            {/* Hook 1 - Visible */}
            <div className="bg-gradient-to-r from-muted/60 to-muted/40 border border-border/50 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">1</span>
                <p className="text-sm text-foreground leading-relaxed">
                  {hooks.split('\n').filter(line => line.trim())[0]?.replace(/^[0-9]+[\.\)]\s*/, '') || hooks.split('\n')[0]}
                </p>
              </div>
            </div>

            {/* Hook 2 - Visible */}
            <div className="bg-gradient-to-r from-muted/60 to-muted/40 border border-border/50 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">2</span>
                <p className="text-sm text-foreground leading-relaxed">
                  {hooks.split('\n').filter(line => line.trim())[1]?.replace(/^[0-9]+[\.\)]\s*/, '') || ''}
                </p>
              </div>
            </div>

            {/* Hook 3 - Locked */}
            <div className="bg-muted/20 border border-border/30 rounded-lg p-3 opacity-60">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded shrink-0">3</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  <span className="text-sm">Hook premium oculto</span>
                </div>
              </div>
            </div>

            {/* Hook 4 - Locked */}
            <div className="bg-muted/20 border border-border/30 rounded-lg p-3 opacity-60">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded shrink-0">4</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  <span className="text-sm">Hook premium oculto</span>
                </div>
              </div>
            </div>

            {/* Hook 5 - Locked */}
            <div className="bg-muted/20 border border-border/30 rounded-lg p-3 opacity-60">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded shrink-0">5</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  <span className="text-sm">Hook premium oculto</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary button - disabled state after generation */}
          <Button 
            variant="secondary"
            disabled
            className="w-full h-10 text-sm font-medium opacity-70"
            size="default"
          >
            <Lock className="h-4 w-4 mr-2" />
            Desbloqueia para gerar mais
          </Button>

          {/* Primary Upgrade CTA */}
          <div className="space-y-2">
            <Button 
              onClick={onUpgrade}
              className="w-full h-11 text-sm font-semibold shadow-md hover:shadow-lg transition-shadow"
              size="lg"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Desbloquear os 5 hooks completos
            </Button>
            
            {/* Micro-copy below CTA */}
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Inclui acesso a todos os prompts, scripts, estruturas e CTAs do pack.
            </p>
          </div>
        </div>
      )}

      {/* Primary action button - before generation */}
      {!hooks && !isLoading && (
        <Button 
          onClick={generateHooks}
          disabled={!tema.trim()}
          className={`w-full h-11 text-sm font-semibold transition-all ${
            tema.trim() 
              ? 'shadow-md hover:shadow-lg bg-primary hover:bg-primary/90' 
              : 'opacity-70'
          }`}
          size="lg"
        >
          <Zap className="h-4 w-4 mr-2" />
          Gerar hooks grátis
        </Button>
      )}
    </div>
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

        <InteractiveHookGenerator onUpgrade={() => setPlan('premium')} />
      </CardContent>
    </Card>
  );
}
