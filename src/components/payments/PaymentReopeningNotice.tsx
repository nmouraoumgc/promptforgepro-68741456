import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

export function PaymentReopeningNotice() {
 const { i18n } = useTranslation();
 const en = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
 const [email,setEmail] = useState('');
 const [consent,setConsent] = useState(false);
 const [loading,setLoading] = useState(false);
 const [state,setState] = useState<'idle'|'success'|'error'>('idle');
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();if(!consent||loading)return;
  setLoading(true);setState('idle');
  try {
   const {data,error}=await supabase.functions.invoke('payment-reopening-waitlist',{body:{email,language:en?'en':'pt',consent:true}});
   if(error||!data?.ok) throw new Error('WAITLIST_FAILED');
   setState('success');setEmail('');setConsent(false);
  } catch {setState('error');} finally {setLoading(false);}
 };
 return <section className="rounded-xl border border-border bg-muted/30 p-5 space-y-3" aria-label={en?'Payments maintenance':'Manutenção dos pagamentos'}>
  <h3 className="font-semibold">{en?'Subscriptions temporarily unavailable':'Subscrições temporariamente indisponíveis'}</h3>
  <p className="text-sm text-muted-foreground">{en?'We are updating our payment system. Pro subscriptions and Prompt Packs purchases will reopen soon. Free registration remains available.':'Estamos a atualizar o sistema de pagamentos. As subscrições Pro e a compra de Prompt Packs voltarão a estar disponíveis em breve. Os registos Free continuam abertos.'}</p>
  <form className="space-y-3" onSubmit={submit}>
   <Label htmlFor="payment-waitlist-email">{en?'Email address':'Endereço de email'}</Label>
   <Input id="payment-waitlist-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@exemplo.com" />
   <label className="flex gap-2 items-start text-xs text-muted-foreground">
    <input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-0.5"/>
    <span>{en?'I agree to receive one email when paid subscriptions reopen. My email will be used only for this notification.':'Aceito receber um email quando as subscrições pagas reabrirem. O meu endereço será utilizado apenas para esta notificação.'}</span>
   </label>
   <Button type="submit" disabled={!consent||loading||!email.trim()}>{loading?(en?'Submitting…':'A registar…'):(en?'Notify me when available':'Avisar-me quando estiver disponível')}</Button>
   {state==='success'&&<p role="status" className="text-sm text-primary">{en?'Request received. We will notify you when payments reopen.':'Pedido recebido. Avisamos-te quando os pagamentos reabrirem.'}</p>}
   {state==='error'&&<p role="alert" className="text-sm text-destructive">{en?'Could not save your request. Please try again later.':'Não foi possível guardar o pedido. Tenta novamente mais tarde.'}</p>}
  </form>
 </section>;
}
