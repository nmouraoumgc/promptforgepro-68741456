import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

/** Payment reopening notice. Submission is intentionally disabled until the
 * server-side waitlist endpoint is deployed and verified. Never fake success. */
export function PaymentReopeningNotice() {
 const { i18n } = useTranslation();
 const en = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
 const [email,setEmail] = useState('');
 return <section className="rounded-xl border border-border bg-muted/30 p-5 space-y-3" aria-label={en?'Payments maintenance':'Manutenção dos pagamentos'}>
   <h3 className="font-semibold">{en?'Subscriptions temporarily unavailable':'Subscrições temporariamente indisponíveis'}</h3>
   <p className="text-sm text-muted-foreground">{en?'We are updating our payment system. Pro subscriptions and Prompt Packs purchases will reopen soon. Free registration remains available.':'Estamos a atualizar o sistema de pagamentos. As subscrições Pro e a compra de Prompt Packs voltarão a estar disponíveis em breve. Os registos Free continuam abertos.'}</p>
   <div className="space-y-2">
    <Label htmlFor="payment-waitlist-email">{en?'Email address':'Endereço de email'}</Label>
    <Input id="payment-waitlist-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@exemplo.com" disabled />
    <Button type="button" disabled>{en?'Notify me when available':'Avisar-me quando estiver disponível'}</Button>
    <p className="text-xs text-muted-foreground">{en?'Notification registration will open once secure storage is ready. No payments can be made.':'O registo para notificações ficará disponível assim que o armazenamento seguro estiver pronto. Não são efetuados pagamentos.'}</p>
   </div>
 </section>;
}
