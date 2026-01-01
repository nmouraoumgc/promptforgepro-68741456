import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wand2, 
  Library, 
  Sparkles, 
  FlaskConical,
  TrendingUp,
  Star,
  Clock,
  Target,
  ArrowRight,
  Zap,
  Award,
  BookOpen,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePromptStore } from '@/stores/promptStore';
import ExamplePromptShowcase from '@/components/dashboard/ExamplePromptShowcase';
import OnboardingChecklist from '@/components/dashboard/OnboardingChecklist';

export default function Dashboard() {
  const { prompts, getFavorites } = usePromptStore();
  const [tipsOpen, setTipsOpen] = useState(false);
  const favorites = getFavorites();
  const recentPrompts = prompts.slice(-5).reverse();
  const hasPrompts = prompts.length > 0;

  const stats = {
    total: prompts.length,
    favorites: favorites.length,
    thisWeek: prompts.filter(p => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(p.createdAt) > weekAgo;
    }).length,
    avgScore: prompts.length > 0 ? prompts.reduce((acc, p) => acc + (p.score?.overall || 0), 0) / prompts.length : 0,
  };

  const secondaryActions = [
    { to: '/library', icon: Library, label: 'Biblioteca' },
    { to: '/optimizer', icon: Sparkles, label: 'Otimizar' },
    { to: '/tester', icon: FlaskConical, label: 'Comparar' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in">
      {/* HERO: Example Prompt Showcase - "Aha Moment" */}
      <ExamplePromptShowcase />

      {/* Onboarding Checklist - Only shown for new users */}
      {!hasPrompts && <OnboardingChecklist />}

      {/* Primary CTA Section */}
      <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-card p-4 md:p-6 border border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-semibold">
              {hasPrompts ? 'Continua a criar' : 'Começa aqui'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {hasPrompts 
                ? 'Adiciona um novo prompt à tua biblioteca' 
                : 'Cria o teu primeiro prompt em menos de 30 segundos'}
            </p>
          </div>
          <Link to="/builder">
            <Button size="lg" className="w-full sm:w-auto gap-2">
              <Wand2 className="h-4 w-4" />
              Criar Prompt
            </Button>
          </Link>
        </div>
        
        {/* Secondary Actions - Grouped */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground mr-2">Outras ações:</span>
          {secondaryActions.map((action) => (
            <Link key={action.to} to={action.to}>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8">
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats - Compact Row (only show if user has prompts) */}
      {hasPrompts && (
        <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm"><strong>{stats.total}</strong> prompts</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-warning" />
            <span className="text-sm"><strong>{stats.favorites}</strong> favoritos</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-sm"><strong>{stats.thisWeek}</strong> esta semana</span>
          </div>
          <div className="h-4 w-px bg-border hidden md:block" />
          <div className="hidden md:flex items-center gap-2">
            <Award className="h-4 w-4 text-accent" />
            <span className="text-sm"><strong>{stats.avgScore.toFixed(0)}%</strong> score médio</span>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Recent Prompts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
            <div>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Clock className="h-4 w-4 md:h-5 md:w-5" />
                Prompts Recentes
              </CardTitle>
              <CardDescription className="hidden md:block">Os teus últimos prompts criados</CardDescription>
            </div>
            <Link to="/library">
              <Button variant="ghost" size="sm" className="text-xs md:text-sm">
                Ver todos <ArrowRight className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            {recentPrompts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center">
                <Wand2 className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm md:text-base font-medium mb-2">Cria o teu primeiro prompt em menos de 30 segundos</p>
                <p className="text-xs text-muted-foreground mb-4">O construtor guiado ajuda-te passo a passo</p>
                <Link to="/builder">
                  <Button size="sm">
                    <Wand2 className="mr-2 h-4 w-4" />
                    Começar agora
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPrompts.map((prompt) => (
                  <Link key={prompt.id} to={`/library?id=${prompt.id}`}>
                    <div className="flex items-center gap-3 md:gap-4 rounded-lg border border-border p-3 md:p-4 transition-colors hover:bg-accent/50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate text-sm md:text-base">{prompt.title}</p>
                          {prompt.isFavorite && (
                            <Star className="h-3 w-3 md:h-4 md:w-4 fill-warning text-warning shrink-0" />
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {prompt.content.substring(0, 60)}...
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs hidden sm:inline-flex">{prompt.category}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips Card - Collapsed by default */}
        <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="p-4 md:p-6 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Zap className="h-4 w-4 text-primary" />
                      Dicas Rápidas
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">Afina os teus prompts</CardDescription>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${tipsOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium text-xs mb-1">💡 Define o objetivo claramente</p>
                  <p className="text-xs text-muted-foreground">
                    Prompts vagos geram resultados genéricos.
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium text-xs mb-1">🎯 Controla o formato do output</p>
                  <p className="text-xs text-muted-foreground">
                    Especifica o formato: lista, parágrafo, código.
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium text-xs mb-1">🔄 Itera e refina</p>
                  <p className="text-xs text-muted-foreground">
                    Usa o versionamento para melhorar.
                  </p>
                </div>
                <Link to="/learn" className="block">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    <BookOpen className="mr-2 h-3 w-3" />
                    Mais dicas
                  </Button>
                </Link>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
