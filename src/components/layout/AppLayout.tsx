import { Outlet, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useEffect } from 'react';
import { usePromptStore } from '@/stores/promptStore';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';

export function AppLayout() {
  const { darkMode } = usePromptStore();
  const location = useLocation();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <PaymentTestModeBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">
            <Outlet />
            <footer className="border-t border-border mt-12 py-6 px-6">
              <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span>© {new Date().getFullYear()} Prompt Forge Pro</span>
                <Link to="/terms" className="hover:text-foreground transition-colors">Termos & Condições</Link>
                <Link to="/refunds" className="hover:text-foreground transition-colors">Reembolsos</Link>
                <Link to="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

