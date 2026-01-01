import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Flame,
  Home,
  Wand2,
  Library,
  Sparkles,
  GitBranch,
  FlaskConical,
  GraduationCap,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Menu,
  X,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  description?: string;
}

const mainNavItems: NavItem[] = [
  { to: '/', icon: Home, label: 'Dashboard', description: 'Visão geral' },
  { to: '/builder', icon: Wand2, label: 'Criar Prompt', description: 'Criador guiado' },
  { to: '/library', icon: Library, label: 'Biblioteca', description: 'Os teus prompts' },
  { to: '/optimizer', icon: Sparkles, label: 'Otimizador', description: 'Melhorar prompts' },
  { to: '/versions', icon: GitBranch, label: 'Versões', description: 'Histórico' },
  { to: '/tester', icon: FlaskConical, label: 'Testar', description: 'Comparar A/B' },
];

const secondaryNavItems: NavItem[] = [
  { to: '/learn', icon: GraduationCap, label: 'Aprender', description: 'Tutoriais' },
  { to: '/packs', icon: Package, label: 'Packs', description: 'Templates prontos' },
  { to: '/planos', icon: CreditCard, label: 'Planos', description: 'Gerir plano' },
  { to: '/settings', icon: Settings, label: 'Definições', description: 'Configurações' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <NavLink to="/" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          {(!collapsed || isMobile) && (
            <span className="text-lg font-bold text-sidebar-foreground">
              Prompt<span className="text-primary">Forge</span>
            </span>
          )}
        </NavLink>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Quick Action */}
      <div className="p-3">
        <NavLink to="/builder" onClick={onNavigate}>
          <Button
            className={cn(
              'w-full gap-2 bg-primary hover:bg-primary/90',
              collapsed && !isMobile && 'px-2'
            )}
          >
            <PlusCircle className="h-4 w-4" />
            {(!collapsed || isMobile) && <span>Novo Prompt</span>}
          </Button>
        </NavLink>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        <div className="py-2">
          {(!collapsed || isMobile) && (
            <span className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Principal
            </span>
          )}
          <div className="mt-2 space-y-1">
            {mainNavItems.map((item) => (
              <SidebarNavItem
                key={item.to}
                item={item}
                collapsed={collapsed && !isMobile}
                isActive={location.pathname === item.to}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        <div className="py-2">
          {(!collapsed || isMobile) && (
            <span className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Mais
            </span>
          )}
          <div className="mt-2 space-y-1">
            {secondaryNavItems.map((item) => (
              <SidebarNavItem
                key={item.to}
                item={item}
                collapsed={collapsed && !isMobile}
                isActive={location.pathname === item.to}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        {(!collapsed || isMobile) && (
          <p className="text-center text-xs text-sidebar-foreground/50">
            Melhores prompts,
            <br />
            melhores resultados.
          </p>
        )}
      </div>
    </>
  );

  // Mobile: Sheet-based sidebar
  if (isMobile) {
    return (
      <>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-4 top-4 z-50 h-10 w-10 bg-sidebar/95 backdrop-blur-sm shadow-lg md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Standard sidebar
  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <SidebarContent />
    </aside>
  );
}

function SidebarNavItem({
  item,
  collapsed,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const content = (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col">
          <span className="font-medium">{item.label}</span>
          {item.description && (
            <span className="text-xs text-muted-foreground">{item.description}</span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
