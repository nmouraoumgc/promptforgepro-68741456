// "Executar": runs a prompt in-app (edge function run-prompt; daily quota per plan enforced server-side).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Loader2, Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useIsEnglish } from '@/i18n/lang';
import { useToast } from '@/hooks/use-toast';
import { toPlainText } from '@/lib/plainText';
import { cn } from '@/lib/utils';

type Quota = { used: number; limit: number } | null;

async function invokeRun(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('run-prompt', { body });
  if (error) {
    // Non-2xx: read the JSON body the function returned (limit reached, AI busy...).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (error as any)?.context;
    let payload: Record<string, unknown> | null = null;
    try { payload = ctx && typeof ctx.json === 'function' ? await ctx.json() : null; } catch { payload = null; }
    return { error: (payload?.error as string) || 'error', code: payload?.code as string | undefined, used: payload?.used as number | undefined, limit: payload?.limit as number | undefined };
  }
  return data as { result?: string; error?: string; used?: number; limit?: number; code?: string };
}

export function RunPrompt({ prompt, compact = false, className, withBrand = false, autoRun = false }: { prompt: string; compact?: boolean; className?: string; withBrand?: boolean; autoRun?: boolean }) {
  const isEnglish = useIsEnglish();
  const user = useAuthStore((s) => s.user);
  const plan = useAuthStore((s) => s.profile?.current_plan ?? 'free');
  const { toast } = useToast();
  const [result, setResult] = useState('');
  const [running, setRunning] = useState(false);
  const [quota, setQuota] = useState<Quota>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [brandUsed, setBrandUsed] = useState<string | null>(null);
  const [autoDone, setAutoDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    invokeRun({ peek: true }).then((d) => { if (alive && typeof d?.limit === 'number') { setQuota({ used: d.used ?? 0, limit: d.limit }); setLimitHit((d.used ?? 0) >= d.limit); } });
    return () => { alive = false; };
  }, [user]);

  const run = async () => {
    if (!prompt.trim()) return;
    setRunning(true); setResult('');
    try {
      const d = await invokeRun({ prompt, language: isEnglish ? 'en' : 'pt', ...(withBrand ? { useBrand: true } : {}) }) as Awaited<ReturnType<typeof invokeRun>> & { brand?: { name: string } | null };
      setBrandUsed(d?.brand?.name ?? null);
      if (typeof d?.limit === 'number') setQuota({ used: d.used ?? 0, limit: d.limit });
      if (d?.code === 'RUN_LIMIT') { setLimitHit(true); return; }
      if (d?.error || !d?.result) {
        toast({ title: isEnglish ? 'Could not run' : 'Não foi possível executar', description: d?.error && d.error !== 'error' ? d.error : (isEnglish ? 'Try again in a moment.' : 'Tenta novamente daqui a pouco.'), variant: 'destructive' });
        return;
      }
      setResult(toPlainText(d.result));
      if ((d.used ?? 0) >= (d.limit ?? Infinity)) setLimitHit(true);
    } finally { setRunning(false); }
  };

  useEffect(() => { if (autoRun && !autoDone && user && prompt.trim()) { setAutoDone(true); run(); } }, [autoRun, autoDone, user, prompt]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    toast({ title: isEnglish ? 'Copied!' : 'Copiado!', description: isEnglish ? 'Result copied to the clipboard' : 'Resultado copiado para a área de transferência' });
  };

  if (!user) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        <Link to="/signup" className="text-primary hover:underline">{isEnglish ? 'Create a free account' : 'Cria uma conta grátis'}</Link>
        {isEnglish ? ' to run prompts here.' : ' para executar prompts aqui.'}
      </p>
    );
  }

  const left = quota ? Math.max(0, quota.limit - quota.used) : null;

  return (
    <div className={cn('space-y-3', className)} data-testid="run-prompt">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={running || !prompt.trim() || limitHit} size={compact ? 'sm' : 'default'} className="gap-2" data-testid="run-button">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? (isEnglish ? 'Running...' : 'A executar...') : (isEnglish ? 'Run' : 'Executar')}
        </Button>
        {left !== null && (
          <span className="text-xs text-muted-foreground" data-testid="run-quota">
            {isEnglish ? `${left} of ${quota!.limit} runs left today` : `${left} de ${quota!.limit} execuções disponíveis hoje`}
          </span>
        )}
      </div>
      {limitHit && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm" data-testid="run-limit">
          {isEnglish ? `You've used all ${quota?.limit ?? ''} runs for today. They reset at midnight (Lisbon time).` : `Já usaste as ${quota?.limit ?? ''} execuções de hoje. Renovam à meia-noite (hora de Lisboa).`}
          {plan !== 'premium' && (
            <> {' '}<Link to="/pricing" className="font-medium text-primary hover:underline">{plan === 'pro' ? (isEnglish ? 'Premium gives 300/day.' : 'O Premium dá 300 por dia.') : (isEnglish ? 'Pro gives 100/day.' : 'O Pro dá 100 por dia.')}</Link></>
          )}
        </div>
      )}
      {result && (
        <Card className="bg-muted/40" data-testid="run-result">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{isEnglish ? 'AI answer' : 'Resposta da IA'}{brandUsed && <span className="ml-2 text-xs font-normal text-muted-foreground" data-testid="run-brand">· {isEnglish ? 'brand' : 'marca'}: {brandUsed}</span>}</p>
              <Button variant="outline" size="sm" onClick={copy} className="gap-1" data-testid="run-copy">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{isEnglish ? 'Copy' : 'Copiar'}
              </Button>
            </div>
            <p className="text-sm whitespace-pre-wrap break-words text-foreground/90" data-testid="run-result-text">{result}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RunPrompt;

/** "Executar" button that opens a dialog and runs the given text right away (pack templates). */
export function RunPromptDialogButton({ prompt, disabled, withBrand = true }: { prompt: string; disabled?: boolean; withBrand?: boolean }) {
  const isEnglish = useIsEnglish();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" className="w-full sm:w-auto shrink-0 gap-1" disabled={disabled || !prompt.trim()} onClick={() => setOpen(true)} data-testid="template-run">
        <Play className="h-4 w-4" />{isEnglish ? 'Run' : 'Executar'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEnglish ? 'Run this prompt' : 'Executar este prompt'}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{prompt}</p>
          {open && <RunPrompt prompt={prompt} withBrand={withBrand} autoRun />}
        </DialogContent>
      </Dialog>
    </>
  );
}
