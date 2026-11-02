import { Wordmark } from '@/components/brand/Wordmark';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIsEnglish } from '@/i18n/lang';

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/unsubscribe`;
type State = 'loading' | 'subscribed' | 'unsubscribed' | 'invalid' | 'error';

/** Public page behind the email "Unsubscribe" link. Requires a click (link scanners don't unsubscribe people). */
export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const isEnglish = useIsEnglish();
  const L = (pt: string, en: string) => (isEnglish ? en : pt);
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);
  const headers = { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`${FN}?t=${encodeURIComponent(token)}`, { headers })
      .then(async (r) => { if (!r.ok) return setState(r.status === 500 ? 'error' : 'invalid'); const j = await r.json(); setState(j.unsubscribed ? 'unsubscribed' : 'subscribed'); })
      .catch(() => setState('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submit = async (resubscribe: boolean) => {
    setBusy(true);
    try {
      const r = await fetch(FN, { method: 'POST', headers, body: JSON.stringify({ token, resubscribe }) });
      const j = await r.json().catch(() => ({}));
      setState(r.ok ? (j.unsubscribed ? 'unsubscribed' : 'subscribed') : 'error');
    } catch { setState('error'); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full"><CardContent className="p-8 text-center space-y-4" data-testid="unsub-card">
        <p className="text-xl"><Wordmark /></p>
        {state === 'loading' && <p className="text-muted-foreground">{L('A carregar…', 'Loading…')}</p>}
        {state === 'subscribed' && (<>
          <p data-testid="unsub-state">{L('Queres deixar de receber emails promocionais do PromptForge Pro?', 'Stop receiving promotional emails from PromptForge Pro?')}</p>
          <p className="text-sm text-muted-foreground">{L('Continuas a receber emails essenciais da conta (ex.: faturação).', 'You will still get essential account emails (e.g. billing).')}</p>
          <Button onClick={() => submit(false)} disabled={busy} data-testid="unsub-confirm">{L('Cancelar subscrição', 'Unsubscribe')}</Button>
        </>)}
        {state === 'unsubscribed' && (<>
          <p data-testid="unsub-state">{L('Feito. Já não vais receber emails promocionais.', "Done. You won't receive promotional emails anymore.")}</p>
          <Button variant="outline" onClick={() => submit(true)} disabled={busy} data-testid="unsub-undo">{L('Afinal quero receber', 'Resubscribe')}</Button>
        </>)}
        {state === 'invalid' && <p data-testid="unsub-state">{L('Este link não é válido ou expirou.', 'This link is invalid or has expired.')}</p>}
        {state === 'error' && <p data-testid="unsub-state">{L('Algo correu mal. Tenta de novo mais tarde.', 'Something went wrong. Please try again later.')}</p>}
        <p className="text-sm"><Link className="underline text-muted-foreground" to="/">promptforgepro.me</Link></p>
      </CardContent></Card>
    </div>
  );
}
