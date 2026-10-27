import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  Flame,
  Home,
  Wand2,
  Zap,
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
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthStore } from '@/stores/authStore';

interface NavItem {
  to: string;
  icon: React.ElementType;
  labelKey: string;
  descriptionKey: string;
  adminOnly?: boolean;
}

// 5 items. Account items (Cofre de marca, Planos, Definições, Admin) live in the header user menu.
const mainNavItems: NavItem[] = [
  { to: '/', icon: Home, labelKey: 'nav.dashboard', descriptionKey: 'nav.dashboardDesc' },
  { to: '/create', icon: Wand2, labelKey: 'nav.create', descriptionKey: 'nav.createDesc' },
  { to: '/library', icon: Library, labelKey: 'nav.library', descriptionKey: 'nav.libraryDesc' },
  { to: '/packs', icon: Package, labelKey: 'nav.packs', descriptionKey: 'nav.packsDesc' },
  { to: '/learn', icon: GraduationCap, labelKey: 'nav.learn', descriptionKey: 'nav.learnDesc' },
];

/** Which nav item a path belongs to (old routes map to their new home). */
const sectionOf = (path: string): string => {
  if (path === '/') return '/';
  if (/^\/(create|quick|builder|optimizer)(\/|$)/.test(path)) return '/create';
  if (/^\/(library|tester|versions)(\/|$)/.test(path)) return '/library';
  if (path.startsWith('/packs')) return '/packs';
  if (path.startsWith('/learn')) return '/learn';
  return '';
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isAdmin } = useAuthStore();
  const { t } = useTranslation();

  const section = sectionOf(location.pathname);

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
        <NavLink to="/create" onClick={onNavigate}>
          <Button
            className={cn(
              'w-full gap-2 bg-primary hover:bg-primary/90',
              collapsed && !isMobile && 'px-2'
            )}
          >
            <PlusCircle className="h-4 w-4" />
            {(!collapsed || isMobile) && <span>{t('nav.newPrompt')}</span>}
          </Button>
        </NavLink>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        <div className="py-2">
          {(!collapsed || isMobile) && (
            <span className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {t('nav.main')}
            </span>
          )}
          <div className="mt-2 space-y-1">
            {mainNavItems.map((item) => (
              <SidebarNavItem
                key={item.to}
                item={item}
                collapsed={collapsed && !isMobile}
                isActive={section === item.to}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        {(!collapsed || isMobile) && (
          <div className="space-y-1 text-center">
            <NavLink to="/pricing" onClick={onNavigate} className="block text-xs text-sidebar-foreground/70 hover:text-primary" data-testid="sidebar-pricing">
              {t('nav.plansPricing')}
            </NavLink>
            <p className="text-xs text-sidebar-foreground/50 whitespace-pre-line">{t('common.tagline')}</p>
          </div>
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
  const { t } = useTranslation();
  const label = t(item.labelKey);
  const description = t(item.descriptionKey);

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
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col">
          <span className="font-medium">{label}</span>
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
