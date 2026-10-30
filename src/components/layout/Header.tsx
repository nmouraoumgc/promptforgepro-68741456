import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, User, LogOut, Settings, ShieldCheck, Palette, CreditCard } from 'lucide-react';
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
import { useAuthStore } from '@/stores/authStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Wordmark } from '@/components/brand/Wordmark';

export function Header() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, profile, isAdmin, signOut } = useAuthStore();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      {/* Logo - clickable to Dashboard */}
      <Link to="/app" aria-label="PromptForge Pro" className={`flex min-w-0 items-center gap-2 ${isMobile ? 'ml-12' : ''}`}>
        <Wordmark className="text-base text-foreground sm:text-lg" />
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
        {/* Search - hidden on mobile */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('nav.searchPrompts')}
            className="w-64 pl-9"
          />
        </div>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Auth Section */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="user-menu" aria-label={t('header.myAccount')}>
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.email || user.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {t('header.plan', { plan: profile?.current_plan || 'free' })}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {t('header.adminBackoffice')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate('/account')} data-testid="menu-account">
                <User className="mr-2 h-4 w-4" />
                {t('header.myAccount')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/brand')} data-testid="menu-brand">
                <Palette className="mr-2 h-4 w-4" />
                {t('header.brand')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/pricing')} data-testid="menu-plans">
                <CreditCard className="mr-2 h-4 w-4" />
                {t('header.plans')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                {t('header.settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t('header.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">{t('header.login')}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/signup">{t('header.signup')}</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
