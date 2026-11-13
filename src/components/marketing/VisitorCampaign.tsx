import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useIsEnglish } from '@/i18n/lang';
import { track } from '@/lib/analytics';
import { CAMPAIGN_COOLDOWN, CAMPAIGN_DISMISS_KEY, canShowCampaign, hasReachedCampaignTrigger } from '@/lib/marketingCampaign';

export function VisitorCampaign() {
  const en = useIsEnglish();
  const [visible, setVisible] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (finished) return;
    const start = Date.now();
    const check = () => {
      let until = 0;
      try { until = Number(localStorage.getItem(CAMPAIGN_DISMISS_KEY)) || 0; } catch { /* storage unavailable */ }
      const height = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const progress = height > 0 ? window.scrollY / height : 0;
      const notice = !!document.querySelector('[data-testid="pwa-install-reminder"], [role="dialog"][data-state="open"]');
      if (hasReachedCampaignTrigger(Date.now() - start, progress) && canShowCampaign(Date.now(), until, notice)) {
        setVisible(true);
        setFinished(true);
        track('visitor_campaign_viewed', { campaign: 'first_prompt_v1' });
      }
    };
    const timer = window.setInterval(check, 1000);
    window.addEventListener('scroll', check, { passive: true });
    return () => { window.clearInterval(timer); window.removeEventListener('scroll', check); };
  }, [finished]);

  const dismiss = (action: 'dismissed' | 'clicked') => {
    try { localStorage.setItem(CAMPAIGN_DISMISS_KEY, String(Date.now() + CAMPAIGN_COOLDOWN)); } catch { /* storage unavailable */ }
    setVisible(false);
    track(`visitor_campaign_${action}`, { campaign: 'first_prompt_v1' });
  };
  if (!visible) return null;
  return (
    <aside data-testid="visitor-campaign" aria-label={en ? 'Get started free' : 'Começar gratuitamente'} className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-sm rounded-2xl border border-border bg-background p-4 shadow-xl sm:left-auto sm:right-6">
      <button type="button" onClick={() => dismiss('dismissed')} aria-label={en ? 'Close' : 'Fechar'} className="absolute right-3 top-3 rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-4 w-4" /></button>
      <h2 className="pr-7 font-semibold">{en ? 'Turn an idea into a structured prompt' : 'Da ideia a um prompt estruturado'}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{en ? 'Describe what you need and create a prompt for your AI tool. Start free, with no credit card required.' : 'Descreva o que pretende e crie um prompt para usar na sua ferramenta de IA. Comece gratuitamente, sem cartão de crédito.'}</p>
      <Link to="/signup" onClick={() => dismiss('clicked')} className="mt-3 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{en ? 'Get started free' : 'Começar gratuitamente'}</Link>
    </aside>
  );
}
