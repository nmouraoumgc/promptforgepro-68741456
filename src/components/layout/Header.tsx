import { useLocation } from 'react-router-dom';
import { Sun, Moon, Search, Bell, User } from 'lucide-react';
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
};

export function Header() {
  const location = useLocation();
  const { darkMode, toggleDarkMode, userProfile, setUserProfile, searchPrompts } = usePromptStore();
  const isMobile = useIsMobile();
  
  const pageInfo = pageTitles[location.pathname] || { title: 'PromptForge' };

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

        {/* Notifications - hidden on small mobile */}
        <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:flex">
          <Bell className="h-5 w-5" />
        </Button>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Perfil de Utilizador</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setUserProfile('beginner')}
              className={userProfile === 'beginner' ? 'bg-accent' : ''}
            >
              🎯 Iniciante
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setUserProfile('content-creator')}
              className={userProfile === 'content-creator' ? 'bg-accent' : ''}
            >
              ✍️ Criador de Conteúdo
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setUserProfile('developer')}
              className={userProfile === 'developer' ? 'bg-accent' : ''}
            >
              💻 Programador
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setUserProfile('designer')}
              className={userProfile === 'designer' ? 'bg-accent' : ''}
            >
              🎨 Designer
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setUserProfile('business')}
              className={userProfile === 'business' ? 'bg-accent' : ''}
            >
              💼 Empresarial
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
