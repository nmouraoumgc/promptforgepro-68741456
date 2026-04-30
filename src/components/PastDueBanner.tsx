import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { getPaddleEnvironment } from '@/lib/paddle';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function PastDueBanner() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
  const [isPastDue, setIsPastDue] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!user) { setIsPastDue(false); return; }
    let cancelled = false;
    const env = getPaddleEnvironment();
    supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('environment', env)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsPastDue(data?.status === 'past_due');
      });

    // Realtime: react to webhook updates without a reload.
    const channel = supabase
      .channel(`subscriptions-pastdue-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'subscriptions',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .eq('environment', env)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => setIsPastDue(data?.status === 'past_due'));
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user]);

  if (!isPastDue) return null;

  const updatePayment = async () => {
    setOpening(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw new Error(error.message);
      if (data?.url) window.open(data.url, '_blank');
    } catch (e) {
      toast({
        title: isEnglish ? 'Could not open billing portal' : 'Não foi possível abrir o portal',
        description: isEnglish ? 'Please try again.' : 'Por favor tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="w-full bg-destructive/10 border-b border-destructive/30 px-4 py-2 flex flex-wrap items-center justify-center gap-3 text-sm">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">
          {isEnglish
            ? 'Last payment failed. Update your payment method to keep Pro access.'
            : 'O último pagamento falhou. Atualiza o método de pagamento para manter o acesso Pro.'}
        </span>
      </div>
      <Button size="sm" variant="destructive" onClick={updatePayment} disabled={opening}>
        {opening
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : (isEnglish ? 'Update payment method' : 'Atualizar método de pagamento')}
      </Button>
    </div>
  );
}
