import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Search, User, LogIn, LogOut, Settings, ShieldCheck, Flame } from 'lucide-react';
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

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = usePromptStore();
  const { user, profile, isAdmin, signOut } = useAuthStore();
  const isMobile = useIsMobile();
  
  const isHomePage = location.pathname === '/';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      {/* Logo - clickable to Dashboard */}
      <Link to="/" className={`flex items-center gap-2 ${isMobile ? 'ml-12' : ''}`}>
        {isHomePage && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <span className="text-lg font-bold text-foreground">
          Prompt<span className="text-primary">Forge</span>
        </span>
      </Link>

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
