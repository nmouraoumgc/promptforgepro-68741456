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
  Flame,
  Zap,
  Award,
  BookOpen
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePromptStore } from '@/stores/promptStore';

export default function Dashboard() {
  const { prompts, getFavorites, userProfile } = usePromptStore();
  const favorites = getFavorites();
  const recentPrompts = prompts.slice(-5).reverse();

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

  const quickActions = [
    { to: '/builder', icon: Wand2, label: 'Criar Prompt', description: 'Construtor guiado', color: 'bg-primary text-primary-foreground' },
    { to: '/library', icon: Library, label: 'Biblioteca', description: 'Ver todos os prompts', color: 'bg-accent text-accent-foreground' },
    { to: '/optimizer', icon: Sparkles, label: 'Otimizar', description: 'Melhorar com IA', color: 'bg-success text-success-foreground' },
    { to: '/tester', icon: FlaskConical, label: 'Testar A/B', description: 'Comparar prompts', color: 'bg-info text-info-foreground' },
  ];

  const getProfileGreeting = () => {
    const greetings: Record<string, string> = {
      'beginner': 'Pronto para criar prompts incríveis?',
      'content-creator': 'Hora de criar conteúdo que converte!',
      'developer': 'Vamos otimizar o teu workflow de código!',
      'designer': 'Prepara-te para gerar visuais impressionantes!',
      'business': 'Aumenta a produtividade com IA!'
    };
    return greetings[userProfile];
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-card p-4 md:p-8 border border-border">
        <div className="absolute inset-0 opacity-50" style={{ background: 'var(--gradient-glow)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-primary">
              <Flame className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Olá, Prompt Master!</h2>
              <p className="text-sm text-muted-foreground">{getProfileGreeting()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-4 md:mt-6">
            {quickActions.map((action) => (
              <Link key={action.to} to={action.to}>
                <Card className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 h-full">
                  <CardContent className="flex flex-col md:flex-row items-center gap-2 md:gap-4 p-3 md:p-4">
                    <div className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg ${action.color}`}>
                      <action.icon className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <p className="font-medium text-sm md:text-base">{action.label}</p>
                      <p className="text-xs text-muted-foreground hidden md:block">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hidden md:block" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 md:gap-4 p-4 md:p-6">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-primary/10">
              <Target className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold">{stats.total}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Total de Prompts</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-3 md:gap-4 p-4 md:p-6">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-warning/10">
              <Star className="h-5 w-5 md:h-6 md:w-6 text-warning" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold">{stats.favorites}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Favoritos</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-3 md:gap-4 p-4 md:p-6">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-success/10">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-success" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold">{stats.thisWeek}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Esta Semana</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-3 md:gap-4 p-4 md:p-6">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-accent/10">
              <Award className="h-5 w-5 md:h-6 md:w-6 text-accent" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold">{stats.avgScore.toFixed(0)}%</p>
              <p className="text-xs md:text-sm text-muted-foreground">Score Médio</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <p className="text-sm md:text-base text-muted-foreground mb-4">Ainda não criaste nenhum prompt</p>
                <Link to="/builder">
                  <Button size="sm">
                    <Wand2 className="mr-2 h-4 w-4" />
                    Criar primeiro prompt
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

        {/* Tips Card */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Dicas Rápidas
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Melhora os teus prompts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0 md:pt-0">
            <div className="rounded-lg bg-muted/50 p-3 md:p-4">
              <p className="font-medium text-xs md:text-sm mb-1">💡 Sê específico</p>
              <p className="text-xs text-muted-foreground">
                Prompts vagos geram resultados genéricos. Adiciona detalhes sobre formato, tom e contexto.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 md:p-4">
              <p className="font-medium text-xs md:text-sm mb-1">🎯 Define o output</p>
              <p className="text-xs text-muted-foreground">
                Diz explicitamente o que esperas: lista, parágrafo, código, etc.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 md:p-4">
              <p className="font-medium text-xs md:text-sm mb-1">🔄 Itera e refina</p>
              <p className="text-xs text-muted-foreground">
                Usa o versionamento para melhorar progressivamente os teus prompts.
              </p>
            </div>
            <Link to="/learn" className="block">
              <Button variant="outline" className="w-full text-sm">
                <BookOpen className="mr-2 h-4 w-4" />
                Ver mais dicas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
