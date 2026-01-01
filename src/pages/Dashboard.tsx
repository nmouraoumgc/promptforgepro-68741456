import { Link } from 'react-router-dom';
import { 
  Wand2, 
  Library, 
  Sparkles, 
  FlaskConical,
  Star,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePromptStore } from '@/stores/promptStore';
import ExamplePromptShowcase from '@/components/dashboard/ExamplePromptShowcase';

export default function Dashboard() {
  const { prompts, getFavorites } = usePromptStore();
  const favorites = getFavorites();
  const recentPrompts = prompts.slice(-3).reverse();

  const stats = {
    total: prompts.length,
    favorites: favorites.length,
    avgScore: prompts.length > 0 
      ? Math.round(prompts.reduce((acc, p) => acc + (p.score?.overall || 0), 0) / prompts.length)
      : 0,
  };

  const actions = [
    { 
      to: '/builder', 
      icon: Wand2, 
      label: 'Criar Prompt', 
      description: 'Do zero à excelência',
      gradient: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary',
    },
    { 
      to: '/library', 
      icon: Library, 
      label: 'Biblioteca', 
      description: 'Os teus prompts, organizados',
      gradient: 'from-accent/20 to-accent/5',
      iconBg: 'bg-accent',
    },
    { 
      to: '/optimizer', 
      icon: Sparkles, 
      label: 'Otimizar', 
      description: 'Versões mais fortes',
      gradient: 'from-success/20 to-success/5',
      iconBg: 'bg-success',
    },
    { 
      to: '/tester', 
      icon: FlaskConical, 
      label: 'Testar A/B', 
      description: 'Descobre o melhor',
      gradient: 'from-info/20 to-info/5',
      iconBg: 'bg-info',
    },
  ];

  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-8 md:space-y-10 animate-fade-in max-w-6xl mx-auto">
      {/* Hero Greeting */}
      <header className="text-center space-y-3 pt-4 md:pt-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Olá, Prompt Master!
        </h1>
        <p className="text-foreground/70 text-base md:text-lg font-medium">
          O que vais criar hoje?
        </p>
      </header>

      {/* Primary Action Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {actions.map((action) => (
          <Link key={action.to} to={action.to} className="group">
            <Card className={`h-full border-0 bg-gradient-to-br ${action.gradient} hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer`}>
              <CardContent className="flex flex-col items-center justify-center text-center p-6 md:p-8 space-y-4">
                <div className={`flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl ${action.iconBg} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon className="h-7 w-7 md:h-8 md:w-8 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-base md:text-lg">{action.label}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Example Showcase - Featured, directly below actions */}
      <ExamplePromptShowcase />

      {/* Ambient Stats + Recent - Secondary content */}
      {prompts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-6 md:gap-10 text-sm text-muted-foreground">
            <span>{stats.total} prompts</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{stats.favorites} favoritos</span>
            {stats.avgScore > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
                <span className="hidden sm:inline">{stats.avgScore}% score médio</span>
              </>
            )}
          </div>

          {/* Recent Prompts - Compact */}
          <Card className="border-border/50">
            <div className="flex items-center justify-between p-4 pb-0">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Recentes</span>
              </div>
              <Link to="/library">
                <span className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  Ver todos <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {recentPrompts.map((prompt) => (
                  <Link key={prompt.id} to={`/library?id=${prompt.id}`}>
                    <Badge 
                      variant="secondary" 
                      className="py-1.5 px-3 hover:bg-muted transition-colors cursor-pointer"
                    >
                      {prompt.isFavorite && <Star className="h-3 w-3 fill-warning text-warning mr-1.5" />}
                      {prompt.title}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
