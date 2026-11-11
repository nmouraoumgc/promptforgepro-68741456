import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Share2, PlusSquare, X, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
const STORAGE_KEY = 'pf-pwa-install-dismissed-until';
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const HIDDEN_PATHS = ['/checkout', '/purchase-success', '/subscription-success', '/reset-password', '/admin'];

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallAppReminder() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  const en = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'other'>('other');

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setPlatform(ios ? 'ios' : 'other');
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => { setVisible(false); setDeferredPrompt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    const timer = window.setTimeout(() => {
      let dismissedUntil = 0;
      try { dismissedUntil = Number(localStorage.getItem(STORAGE_KEY) || 0); } catch { /* storage unavailable */ }
      if (!isInstalled() && Date.now() >= dismissedUntil) setVisible(true);
    }, 12000);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now() + COOLDOWN_MS)); } catch { /* storage unavailable */ }
    setVisible(false);
  };

  const install = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        if (choice.outcome === 'accepted') { setVisible(false); return; }
      } catch { /* browser rejected prompt: show manual instructions */ }
    }
    setShowSteps(true);
  };

  if (!visible || isInstalled() || HIDDEN_PATHS.some((path) => pathname.startsWith(path))) return null;

  return (
    <aside aria-label={en ? 'Install PromptForge Pro' : 'Instalar PromptForge Pro'}
      className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur-md sm:left-auto sm:right-6 sm:bottom-6"
      data-testid="pwa-install-reminder">
      <button type="button" aria-label={en ? 'Dismiss reminder' : 'Fechar lembrete'} onClick={dismiss}
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Smartphone className="h-5 w-5" /></div>
        <div>
          <p className="font-semibold text-foreground">{en ? 'Keep PromptForge Pro one tap away' : 'O PromptForge Pro sempre à mão'}</p>
          <p className="mt-1 text-sm text-muted-foreground">{en ? 'Add it to your home screen for quick access, just like an app. No app store needed.' : 'Adiciona-o ao ecrã principal para acesso rápido, como uma app. Sem passar pela loja de aplicações.'}</p>
        </div>
      </div>
      {showSteps ? (
        <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm" data-testid="pwa-install-steps">
          {platform === 'ios' ? (
            <p className="flex items-start gap-2"><Share2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {en ? 'In Safari, tap Share, then “Add to Home Screen” and confirm Add. If you do not see this option, open this page in Safari first.' : 'No Safari, toca em Partilhar, escolhe «Adicionar ao ecrã principal» e confirma «Adicionar». Se não encontrares a opção, abre primeiro esta página no Safari.'}
            </p>
          ) : (
            <p className="flex items-start gap-2"><PlusSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {en ? 'Open the browser menu (⋮ or ⋯) and choose “Install app” or “Add to Home screen”, if available.' : 'Abre o menu do navegador (⋮ ou ⋯) e escolhe «Instalar aplicação» ou «Adicionar ao ecrã principal», se disponível.'}
            </p>
          )}
        </div>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        <Button type="button" size="sm" className="flex-1" onClick={install}>
          <Download className="mr-2 h-4 w-4" />{deferredPrompt ? (en ? 'Install app' : 'Instalar app') : (en ? 'See how to add' : 'Ver como adicionar')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={dismiss}>{en ? 'Not now' : 'Agora não'}</Button>
      </div>
    </aside>
  );
}
