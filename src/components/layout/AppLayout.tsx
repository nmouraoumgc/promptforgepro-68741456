import { Outlet, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Suspense } from 'react';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';
import { PastDueBanner } from '@/components/PastDueBanner';
import { useIsEnglish } from '@/i18n/lang';
import { LibrarySync } from '@/components/library/LibrarySync';

export function AppLayout() {
  const isEnglish = useIsEnglish();
  const location = useLocation();

  return (
    <div className="flex h-screen flex-col bg-background">
      <LibrarySync />
      <PaymentTestModeBanner />
      <PastDueBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">
            <Suspense fallback={<div className="min-h-[50vh]" aria-busy="true" />}>
              <Outlet />
            </Suspense>
            <footer className="border-t border-border mt-12 py-6 px-6">
              <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span>© {new Date().getFullYear()} PromptForge Pro</span>
                <a href="https://www.saashub.com/promptforgepro-me?utm_source=badge&utm_campaign=badge&utm_content=promptforgepro-me&badge_variant=dark&badge_kind=approved" target="_blank" rel="noopener noreferrer" aria-label="PromptForge Pro on SaaSHub (opens in a new tab)"><img src="https://cdn-b.saashub.com/img/badges/approved-dark.png?v=1" alt="SaaSHub approved" style={{ maxWidth: '150px', height: 'auto' }} loading="lazy" /></a>
                <Link to="/terms" className="hover:text-foreground transition-colors">{isEnglish ? 'Terms & Conditions' : 'Termos & Condições'}</Link>
                <Link to="/refunds" className="hover:text-foreground transition-colors">{isEnglish ? 'Refunds' : 'Reembolsos'}</Link>
                <Link to="/privacy" className="hover:text-foreground transition-colors">{isEnglish ? 'Privacy' : 'Privacidade'}</Link>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

