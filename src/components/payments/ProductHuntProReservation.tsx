import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ProductHuntProReservation({ billing }: { billing:'monthly'|'annual' }) {
 const {i18n}=useTranslation();
 const en=(i18n.resolvedLanguage||i18n.language||'pt').startsWith('en');
 const [email,setEmail]=useState('');
 const [consent,setConsent]=useState(false);
 const [loading,setLoading]=useState(false);
 const [status,setStatus]=useState<'idle'|'success'|'error'>('idle');
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();if(!consent||loading)return;
  setLoading(true);setStatus('idle');
  try {
   const {data,error}=await supabase.functions.invoke('pro-campaign-reservation',{body:{email,billing,language:en?'en':'pt',campaign:'PRODUCTHUNT20',consent:true}});
   if(error||!data?.ok)throw new Error('RESERVATION_FAILED');
   setStatus('success');setEmail('');setConsent(false);
  } catch {setStatus('error');} finally {setLoading(false);}
 };
 return <section className="rounded-xl border border-border bg-card p-5 space-y-3" data-testid="producthunt-pro-reservation">
  <h3 className="font-semibold">{en?'Product Hunt Pro offer — request a reservation':'Oferta Pro do Product Hunt — pedir reserva'}</h3>
  <p className="text-sm text-muted-foreground">{en?'Request consideration for the Product Hunt 20% Pro offer. Eligibility and campaign terms will be verified before confirmation. If confirmed, the offer is intended to remain available for 48 hours after paid checkout reopens. No payment or Pro access is activated now.':'Pede a reserva da oferta Product Hunt de 20% para o Pro. A elegibilidade e as condições da campanha serão verificadas antes da confirmação. Se confirmada, a oferta deverá ficar disponível durante 48 horas após a reabertura dos pagamentos. Não há cobrança nem ativação do Pro nesta fase.'}</p>
  <p className="text-xs text-muted-foreground">{en?'Selected billing: ':'Faturação selecionada: '}{billing==='annual'?(en?'annual':'anual'):(en?'monthly':'mensal')}</p>
  <form onSubmit={submit} className="space-y-3">
   <label className="block text-sm font-medium" htmlFor="ph-reservation-email">{en?'Email address':'Endereço de email'}</label>
   <Input id="ph-reservation-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@exemplo.com"/>
   <label className="flex gap-2 items-start text-xs text-muted-foreground">
    <input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-0.5"/>
    <span>{en?'I agree to receive one email about this Product Hunt Pro reservation and its eligibility. This is separate from marketing subscriptions.':'Aceito receber um email sobre esta reserva Pro do Product Hunt e a respetiva elegibilidade. Este consentimento é separado das comunicações de marketing.'}</span>
   </label>
   <Button type="submit" disabled={!consent||loading||!email.trim()}>{loading?(en?'Submitting…':'A enviar…'):(en?'Request offer reservation':'Pedir reserva da oferta')}</Button>
   {status==='success'&&<p role="status" className="text-sm text-primary">{en?'Request recorded. The promotional terms still require confirmation.':'Pedido registado. As condições promocionais ainda estão sujeitas a confirmação.'}</p>}
   {status==='error'&&<p role="alert" className="text-sm text-destructive">{en?'Could not save the request. Please try later.':'Não foi possível guardar o pedido. Tenta mais tarde.'}</p>}
  </form>
 </section>;
}
