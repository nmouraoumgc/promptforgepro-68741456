import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type DiscountFlag = {
  id: string;
  created_at: string;
  environment: string;
  email: string | null;
  transaction_id: string;
  subscription_id: string | null;
  kind: string;
  discount_code: string | null;
  discount_id: string | null;
  issued_code: string | null;
  reason: string;
  charged_minor: number | null;
  currency: string | null;
  action_taken: string;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  review_note: string | null;
};

type FailureRow = { user_id: string | null; source: string; created_at: string };

const REASONS: Record<string, [string, string]> = {
  discount_not_issued_by_server: ['Desconto não emitido pelo servidor', 'Discount not issued by the server'],
  discount_already_used: ['Desconto reutilizado na conta', 'Discount reused on the account'],
  discount_mismatch: ['Desconto diferente do emitido', 'Different discount than issued'],
};
const ACTIONS: Record<string, [string, string]> = {
  flagged: ['Só sinalizado', 'Flagged only'],
  subscription_cancelled: ['Subscrição cancelada (0 €)', 'Subscription cancelled (0 €)'],
  access_withheld: ['Acesso não atribuído (0 €)', 'Access withheld (0 €)'],
};
const STATUS: Record<DiscountFlag['status'], [string, string]> = {
  open: ['Aberto', 'Open'],
  under_review: ['Em revisão', 'Under review'],
  resolved: ['Resolvido', 'Resolved'],
  dismissed: ['Ignorado', 'Dismissed'],
};

function money(minor: number | null, currency: string | null) {
  if (minor == null) return '?';
  const v = minor / 100;
  try {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: currency || 'EUR' }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency ?? ''}`;
  }
}

export function AdminFraudFlags({ isEnglish }: { isEnglish: boolean }) {
  const [flags, setFlags] = useState<DiscountFlag[]>([]);
  const [failures, setFailures] = useState<FailureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const L = (pair: [string, string] | undefined, fallback: string) => (pair ? (isEnglish ? pair[1] : pair[0]) : fallback);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [f, pf] = await Promise.all([
      supabase.from('discount_flags' as any).select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('payment_failures' as any).select('user_id, source, created_at').gte('created_at', since).limit(1000),
    ]);
    if (f.error) setError(f.error.message);
    setFlags(((f.data as unknown) as DiscountFlag[]) ?? []);
    setFailures(((pf.data as unknown) as FailureRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const setStatus = async (id: string, status: DiscountFlag['status']) => {
    setBusy(id);
    const { error: e } = await supabase.rpc('admin_review_discount_flag' as any, { _id: id, _status: status } as any);
    setBusy(null);
    if (e) {
      toast.error(isEnglish ? 'Could not update the alert.' : 'Não foi possível atualizar o alerta.');
      return;
    }
    setFlags((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  const open = flags.filter((x) => x.status === 'open' || x.status === 'under_review').length;
  const usersOverLimit = (() => {
    const per = new Map<string, { client: number; webhook: number }>();
    for (const r of failures) {
      if (!r.user_id) continue;
      const c = per.get(r.user_id) ?? { client: 0, webhook: 0 };
      if (r.source === 'webhook') c.webhook++; else c.client++;
      per.set(r.user_id, c);
    }
    return [...per.values()].filter((c) => Math.max(c.client, c.webhook) >= 3).length;
  })();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{isEnglish ? 'Discount alerts' : 'Alertas de descontos'}</CardTitle>
            <CardDescription>
              {isEnglish
                ? 'Transactions with a discount we did not issue, a reused one, or a different one than issued. Nothing is refunded automatically: review each one in Paddle.'
                : 'Transações com um desconto que não emitimos, reutilizado, ou diferente do emitido. Nada é reembolsado automaticamente: revê cada uma no Paddle.'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {isEnglish ? 'Refresh' : 'Atualizar'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
            <span>{isEnglish ? `${open} open` : `${open} por rever`}</span>
            <span>·</span>
            <span>
              {isEnglish
                ? `${failures.length} failed payments in 24h, ${usersOverLimit} accounts at the limit (3)`
                : `${failures.length} pagamentos falhados em 24h, ${usersOverLimit} contas no limite (3)`}
            </span>
          </div>
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}
          {loading ? (
            <p className="text-sm text-muted-foreground">{isEnglish ? 'Loading...' : 'A carregar...'}</p>
          ) : flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">{isEnglish ? 'No alerts.' : 'Sem alertas.'}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isEnglish ? 'Date' : 'Data'}</TableHead>
                  <TableHead>{isEnglish ? 'Account' : 'Conta'}</TableHead>
                  <TableHead>{isEnglish ? 'Reason' : 'Motivo'}</TableHead>
                  <TableHead>{isEnglish ? 'Code' : 'Código'}</TableHead>
                  <TableHead>{isEnglish ? 'Charged' : 'Cobrado'}</TableHead>
                  <TableHead>{isEnglish ? 'Action' : 'Ação'}</TableHead>
                  <TableHead>Paddle</TableHead>
                  <TableHead>{isEnglish ? 'Status' : 'Estado'}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(f.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{f.email ?? '?'}</TableCell>
                    <TableCell>{L(REASONS[f.reason], f.reason)}</TableCell>
                    <TableCell>
                      {f.discount_code ?? f.discount_id ?? '?'}
                      {f.issued_code && f.issued_code !== f.discount_code ? (
                        <span className="block text-xs text-muted-foreground">{isEnglish ? 'issued' : 'emitido'}: {f.issued_code}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {money(f.charged_minor, f.currency)}
                      <span className="block text-xs text-muted-foreground">{f.kind === 'one_time' ? (isEnglish ? 'one-time' : 'compra única') : f.kind === 'subscription' ? (isEnglish ? 'subscription' : 'subscrição') : f.kind}</span>
                    </TableCell>
                    <TableCell>{L(ACTIONS[f.action_taken], f.action_taken)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {f.transaction_id}
                      {f.environment !== 'live' ? <span className="block">{f.environment}</span> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={f.status === 'open' ? 'destructive' : f.status === 'under_review' ? 'default' : 'secondary'}>
                        {L(STATUS[f.status], f.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap space-x-1">
                      {f.status === 'open' && (
                        <Button size="sm" variant="outline" disabled={busy === f.id} onClick={() => void setStatus(f.id, 'under_review')}>
                          {isEnglish ? 'Mark for review' : 'Marcar para revisão'}
                        </Button>
                      )}
                      {(f.status === 'open' || f.status === 'under_review') && (
                        <>
                          <Button size="sm" variant="outline" disabled={busy === f.id} onClick={() => void setStatus(f.id, 'resolved')}>
                            {isEnglish ? 'Resolved' : 'Resolvido'}
                          </Button>
                          <Button size="sm" variant="ghost" disabled={busy === f.id} onClick={() => void setStatus(f.id, 'dismissed')}>
                            {isEnglish ? 'Dismiss' : 'Ignorar'}
                          </Button>
                        </>
                      )}
                      {(f.status === 'resolved' || f.status === 'dismissed') && (
                        <Button size="sm" variant="ghost" disabled={busy === f.id} onClick={() => void setStatus(f.id, 'open')}>
                          {isEnglish ? 'Reopen' : 'Reabrir'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
