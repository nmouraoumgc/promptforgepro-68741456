import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/sonner-toast';

type Block = { id: string; kind: 'email' | 'paddle_customer'; value: string; reason: string; active: boolean };
type Alert = { id: string; transaction_id: string; user_id: string; environment: string; status: string; created_at: string };

export function AdminFraudControls({ isEnglish: en }: { isEnglish: boolean }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [kind, setKind] = useState<'email' | 'paddle_customer'>('email');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const [b, a] = await Promise.all([
      supabase.from('fraud_blocklist' as never).select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('fraud_payment_alerts' as never).select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    setError(b.error?.message || a.error?.message || '');
    setBlocks((b.data || []) as unknown as Block[]); setAlerts((a.data || []) as unknown as Alert[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const add = async () => {
    const v = value.trim().toLowerCase();
    if (!(kind === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : /^ctm_[a-z0-9]{26}$/.test(v)) || reason.trim().length < 3) {
      toast.error(en ? 'Enter a valid identifier and a reason.' : 'Introduz um identificador válido e um motivo.'); return;
    }
    setBusy(true);
    const { error: e } = await supabase.from('fraud_blocklist' as never).insert({ kind, value: v, reason: reason.trim() } as never);
    setBusy(false);
    if (e) { toast.error(en ? 'Could not add block. Check for duplicates.' : 'Não foi possível adicionar o bloqueio. Verifica se já existe.'); return; }
    setValue(''); setReason(''); await load();
  };
  const toggle = async (b: Block) => {
    setBusy(true); const { error: e } = await supabase.from('fraud_blocklist' as never).update({active: !b.active} as never).eq('id', b.id); setBusy(false);
    if (e) toast.error(en ? 'Could not update block.' : 'Não foi possível atualizar o bloqueio.'); else await load();
  };
  const review = async (id: string, status: string) => {
    setBusy(true); const { error: e } = await supabase.from('fraud_payment_alerts' as never).update({status} as never).eq('id', id); setBusy(false);
    if (e) toast.error(en ? 'Could not update alert.' : 'Não foi possível atualizar o alerta.'); else await load();
  };
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>{en ? 'Blocked buyers' : 'Compradores bloqueados'}</CardTitle><CardDescription>{en ? 'Only add confirmed cases. This checks registered email or a Paddle customer linked to a subscription. It does not block direct Paddle checkout.' : 'Adiciona apenas casos confirmados. A verificação usa o email da conta ou um cliente Paddle associado a uma subscrição. Não bloqueia pagamentos iniciados diretamente na Paddle.'}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2"><label><span className="sr-only">{en?'Identifier type':'Tipo de identificador'}</span><select className="border rounded p-2 bg-background" value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="email">Email</option><option value="paddle_customer">Paddle customer ID</option></select></label>
          <Input className="max-w-xs" aria-label={en?'Identifier':'Identificador'} value={value} onChange={e=>setValue(e.target.value)} placeholder={kind==='email'?'email@example.com':'ctm_...'} />
          <Input className="max-w-xs" aria-label={en?'Reason':'Motivo'} value={reason} onChange={e=>setReason(e.target.value)} placeholder={en?'Reason (required)':'Motivo (obrigatório)'} maxLength={500} />
          <Button onClick={()=>void add()} disabled={busy}>{en?'Add block':'Adicionar bloqueio'}</Button></div>
        {blocks.map(b=><div key={b.id} className="flex flex-wrap items-center gap-3 border-b py-2 text-sm"><span>{b.value}</span><span>{b.reason}</span><span>{b.active ? (en?'Active':'Ativo') : (en?'Inactive':'Inativo')}</span><Button size="sm" variant="outline" disabled={busy} onClick={()=>void toggle(b)}>{b.active ? (en?'Deactivate':'Desativar') : (en?'Reactivate':'Reativar')}</Button></div>)}
      </CardContent></Card>
    <Card><CardHeader><CardTitle>{en?'Payments to review':'Pagamentos a rever'}</CardTitle><CardDescription>{en?'Completed payment after a verified failed payment on the same account in 24 hours. This is not proof of fraud. No refunds or access changes are automatic.' : 'Pagamento concluído após uma falha confirmada na mesma conta em 24 horas. Isto não prova fraude. Não há reembolsos ou alterações de acesso automáticos.'}</CardDescription></CardHeader>
      <CardContent className="space-y-3">{error && <p role="alert" className="text-destructive">{error}</p>}{!error && alerts.length===0 && <p>{en?'No alerts.':'Sem alertas.'}</p>}{alerts.map(a=><div key={a.id} className="border-b py-2 text-sm flex flex-wrap items-center gap-3"><span>{new Date(a.created_at).toLocaleString(en?'en-GB':'pt-PT')}</span><span>{a.transaction_id}</span><span>{a.user_id}</span><span>{a.environment}</span><span>{a.status}</span>{a.status==='open' && <><Button size="sm" variant="outline" disabled={busy} onClick={()=>void review(a.id,'reviewed')}>{en?'Reviewed':'Revisto'}</Button><Button size="sm" variant="ghost" disabled={busy} onClick={()=>void review(a.id,'dismissed')}>{en?'Dismiss':'Ignorar'}</Button></>}</div>)}</CardContent></Card>
  </div>;
}
