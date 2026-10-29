import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';

const COOLDOWN_SECONDS = 60;

export function ResendConfirmationButton({ email, isEnglish }: { email: string; isEnglish: boolean }) {
  const { resendConfirmation } = useAuthStore();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onClick = async () => {
    if (!email) return;
    setSending(true);
    const { error } = await resendConfirmation(email);
    setSending(false);
    if (error) {
      const rateLimited = /rate limit|too many|seconds/i.test(error.message || '') || (error as { status?: number }).status === 429;
      toast({
        title: isEnglish ? 'Could not resend' : 'Não foi possível reenviar',
        description: rateLimited
          ? (isEnglish ? 'Too many emails requested. Please wait a few minutes and try again.' : 'Demasiados pedidos de email. Aguarda uns minutos e tenta novamente.')
          : (error.message || (isEnglish ? 'Try again.' : 'Tenta novamente.')),
        variant: 'destructive',
      });
      setCooldown(COOLDOWN_SECONDS);
      return;
    }
    toast({
      title: isEnglish ? 'Email sent' : 'Email enviado',
      description: isEnglish
        ? `We sent a new confirmation link to ${email}. Check your inbox and spam folder.`
        : `Enviámos um novo link de confirmação para ${email}. Verifica a caixa de entrada e o spam.`,
    });
    setCooldown(COOLDOWN_SECONDS);
  };

  return (
    <Button type="button" variant="outline" className="w-full h-11" onClick={onClick} disabled={sending || cooldown > 0 || !email}>
      {sending
        ? (isEnglish ? 'Sending...' : 'A enviar...')
        : cooldown > 0
          ? (isEnglish ? `Resend confirmation email (${cooldown}s)` : `Reenviar email de confirmação (${cooldown}s)`)
          : (isEnglish ? 'Resend confirmation email' : 'Reenviar email de confirmação')}
    </Button>
  );
}
