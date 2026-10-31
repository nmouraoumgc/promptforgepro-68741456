import { Wordmark } from '@/components/brand/Wordmark';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Mail, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const { requestPasswordReset } = useAuthStore();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = email.trim();
    if (!target) return;
    setIsLoading(true);
    const { error } = await requestPasswordReset(target);
    setIsLoading(false);
    if (error) {
      const rateLimited = /rate limit|too many|seconds/i.test(error.message || '') || (error as { status?: number }).status === 429;
      toast({
        title: isEnglish ? 'Could not send the link' : 'Não foi possível enviar o link',
        description: rateLimited
          ? (isEnglish ? 'Too many emails requested. Please wait a few minutes and try again.' : 'Demasiados pedidos de email. Aguarda uns minutos e tenta novamente.')
          : (error.message || (isEnglish ? 'Try again.' : 'Tenta novamente.')),
        variant: 'destructive',
      });
      return;
    }
    setSentTo(target);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Flame className="h-6 w-6 text-primary-foreground" />
          </div>
          <Wordmark className="text-xl  text-foreground" />
        </Link>

        {sentTo ? (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MailCheck className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{isEnglish ? 'Check your email' : 'Verifica o teu email'}</CardTitle>
              <CardDescription>
                {isEnglish ? (
                  <>If there is an account for <strong className="text-foreground">{sentTo}</strong>, we sent a link to reset the password.</>
                ) : (
                  <>Se existir uma conta para <strong className="text-foreground">{sentTo}</strong>, enviámos um link para redefinir a palavra-passe.</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                {isEnglish ? "Can't find it? Check your spam/promotions folder." : 'Não encontras? Verifica a pasta de spam/promoções.'}
              </p>
              <Button asChild className="w-full h-11">
                <Link to="/login">{isEnglish ? 'Go to sign in' : 'Ir para entrar'}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{isEnglish ? 'Recover password' : 'Recuperar palavra-passe'}</CardTitle>
              <CardDescription>
                {isEnglish ? 'Enter your email and we will send you a link to set a new password.' : 'Escreve o teu email e enviamos um link para definires uma nova palavra-passe.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder={isEnglish ? 'your-email@example.com' : 'o-teu-email@exemplo.com'} value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 h-11" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? (isEnglish ? 'Sending...' : 'A enviar...') : (isEnglish ? 'Send recovery link' : 'Enviar link de recuperação')}
                </Button>
              </form>
              <div className="mt-6 text-center text-sm">
                <Link to="/login" className="text-primary hover:underline font-medium">
                  {isEnglish ? 'Back to sign in' : 'Voltar a entrar'}
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
