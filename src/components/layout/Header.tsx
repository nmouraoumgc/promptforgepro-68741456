import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Search, Bell, User, LogIn, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePromptStore } from '@/stores/promptStore';
import { useAuthStore } from '@/stores/authStore';
import { useIsMobile } from '@/hooks/use-mobile';

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Bem-vindo ao PromptForge' },
  '/builder': { title: 'Criar Prompt', subtitle: 'Construtor guiado passo-a-passo' },
  '/library': { title: 'Biblioteca', subtitle: 'Todos os teus prompts' },
  '/optimizer': { title: 'Otimizador', subtitle: 'Melhora os teus prompts com IA' },
  '/versions': { title: 'Versões', subtitle: 'Histórico e comparação' },
  '/tester': { title: 'Testar Prompts', subtitle: 'Comparação A/B' },
  '/learn': { title: 'Aprender', subtitle: 'Tutoriais e guias' },
  '/packs': { title: 'Prompt Packs', subtitle: 'Templates prontos para usar' },
  '/settings': { title: 'Definições', subtitle: 'Configurações da aplicação' },
  '/admin': { title: 'Backoffice', subtitle: 'Gestão de conteúdos' },
};

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = usePromptStore();
  const { user, profile, isAdmin, signOut } = useAuthStore();
  const isMobile = useIsMobile();
  
  const pageInfo = pageTitles[location.pathname] || { title: 'PromptForge' };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      {/* Page Title - offset on mobile for hamburger menu */}
      <div className={isMobile ? 'ml-12' : ''}>
        <h1 className="text-lg md:text-xl font-semibold text-foreground">{pageInfo.title}</h1>
        {pageInfo.subtitle && !isMobile && (
          <p className="text-sm text-muted-foreground">{pageInfo.subtitle}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Search - hidden on mobile */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar prompts..."
            className="w-64 pl-9"
          />
        </div>

        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="h-9 w-9"
        >
          {darkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Auth Section */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.email || user.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    Plano {profile?.current_plan || 'free'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Backoffice Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate('/account')}>
                <User className="mr-2 h-4 w-4" />
                Minha Conta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Definições
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Terminar Sessão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link to="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Entrar
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Criar Conta</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
