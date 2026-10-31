import { Wordmark } from '@/components/brand/Wordmark';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore, initialAuthUrlError } from '@/stores/authStore';
import { ResendConfirmationButton } from '@/components/auth/ResendConfirmationButton';
import { useTranslation } from 'react-i18next';
import { postAuthPath } from '@/lib/campaignCode';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Explicit ?redirect wins; otherwise /pricing when a campaign code is stored (e.g. after email confirmation).
  const redirectTo = postAuthPath(searchParams.get('redirect'));
  const { toast } = useToast();
  const { signIn, user, isLoading: authLoading } = useAuthStore();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<boolean>(!!initialAuthUrlError);
  const fromConfirmLink = searchParams.get('confirmed') === '1';
  const handledConfirm = useRef(false);

  // Landing from the confirmation email (/login?confirmed=1#access_token=...): supabase-js picks the
  // session up from the URL; once it's there, greet the user and send them into the app.
  useEffect(() => {
    if (!fromConfirmLink || handledConfirm.current || authLoading) return;
    if (initialAuthUrlError) {
      handledConfirm.current = true;
      toast({
        title: isEnglish ? 'Confirmation link invalid or expired' : 'Link de confirmação inválido ou expirado',
        description: isEnglish
          ? 'Enter your email below and request a new confirmation link.'
          : 'Escreve o teu email abaixo e pede um novo link de confirmação.',
        variant: 'destructive',
      });
      return;
    }
    handledConfirm.current = true;
    if (user) {
      toast({
        title: isEnglish ? 'Email confirmed!' : 'Email confirmado!',
        description: isEnglish ? 'Welcome to PromptForge Pro.' : 'Bem-vindo ao PromptForge Pro.',
      });
      navigate(redirectTo, { replace: true });
    } else {
      toast({
        title: isEnglish ? 'Email confirmed!' : 'Email confirmado!',
        description: isEnglish ? 'You can now sign in.' : 'Já podes entrar.',
      });
    }
  }, [fromConfirmLink, authLoading, user, isEnglish, navigate, redirectTo, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error, emailNotConfirmed } = await signIn(email, password);

    if (error && emailNotConfirmed) {
      setUnconfirmedEmail(email.trim());
      toast({
        title: isEnglish ? 'Email not confirmed yet' : 'Email ainda não confirmado',
        description: isEnglish
          ? 'Click the link we sent to your email to activate your account. Need a new one? Use the button below.'
          : 'Clica no link que enviámos para o teu email para ativar a conta. Precisas de um novo? Usa o botão abaixo.',
      });
    } else if (error) {
      setUnconfirmedEmail(null);
      toast({
        title: isEnglish ? 'Sign in error' : 'Erro ao entrar',
        description: isEnglish ? 'Incorrect email or password.' : 'Email ou palavra-passe incorretos.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: isEnglish ? 'Welcome back!' : 'Bem-vindo de volta!',
        description: isEnglish ? 'Signed in successfully.' : 'Sessão iniciada com sucesso.',
      });
      navigate(redirectTo);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo - clickable to homepage */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Flame className="h-6 w-6 text-primary-foreground" />
          </div>
          <Wordmark className="text-xl  text-foreground" />
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{isEnglish ? 'Sign in' : 'Entrar'}</CardTitle>
            <CardDescription>
              {isEnglish ? 'Access your PromptForge Pro account' : 'Acede à tua conta PromptForge Pro'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={isEnglish ? 'your-email@example.com' : 'o-teu-email@exemplo.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{isEnglish ? 'Password' : 'Palavra-passe'}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="text-right">
                  <Link to={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : '/forgot-password'} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                    {isEnglish ? 'Forgot your password?' : 'Esqueci-me da password'}
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? (isEnglish ? 'Signing in...' : 'A entrar...') : (isEnglish ? 'Sign in' : 'Entrar')}
              </Button>
            </form>

            {(unconfirmedEmail || linkError) && (
              <div className="mt-4 space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                <p className="text-foreground">
                  {unconfirmedEmail
                    ? (isEnglish
                        ? <>Your email <strong>{unconfirmedEmail}</strong> isn't confirmed yet. Check your inbox (and spam) for the confirmation link.</>
                        : <>O teu email <strong>{unconfirmedEmail}</strong> ainda não foi confirmado. Procura o link de confirmação na caixa de entrada (e no spam).</>)
                    : (isEnglish
                        ? 'That confirmation link is invalid or has expired. Enter your email above and request a new one.'
                        : 'Esse link de confirmação é inválido ou expirou. Escreve o teu email acima e pede um novo.')}
                </p>
                <ResendConfirmationButton email={(unconfirmedEmail || email).trim()} isEnglish={isEnglish} />
                {linkError && !unconfirmedEmail && (
                  <button type="button" onClick={() => setLinkError(false)} className="w-full text-xs text-muted-foreground hover:text-foreground">
                    {isEnglish ? 'Dismiss' : 'Fechar'}
                  </button>
                )}
              </div>
            )}

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{isEnglish ? "Don't have an account? " : 'Não tens conta? '}</span>
              <Link to={searchParams.get('redirect') ? `/signup?redirect=${encodeURIComponent(searchParams.get('redirect') as string)}` : "/signup"} className="text-primary hover:underline font-medium">
                {isEnglish ? 'Create account' : 'Criar conta'}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
