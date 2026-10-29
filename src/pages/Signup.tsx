import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuthStore();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: isEnglish ? 'Error' : 'Erro',
        description: isEnglish ? 'Passwords do not match.' : 'As palavras-passe não coincidem.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: isEnglish ? 'Error' : 'Erro',
        description: isEnglish ? 'Password must have at least 6 characters.' : 'A palavra-passe deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const disposableMsg = isEnglish
      ? 'Disposable/temporary email addresses are not allowed. Please use a permanent email.'
      : 'Emails temporários/descartáveis não são permitidos. Usa um email permanente.';
    // UX pre-check only; the real block is server-side (auth.users trigger on the disposable_email_domains list).
    const { data: isDisposable } = await supabase.rpc('is_disposable_email' as never, { _email: email } as never);
    if (isDisposable === true) {
      toast({ title: isEnglish ? 'Account creation failed' : 'Erro ao criar conta', description: disposableMsg, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password);

    if (error) {
      toast({
        title: isEnglish ? 'Account creation failed' : 'Erro ao criar conta',
        description: /DISPOSABLE_EMAIL/.test(error.message || '') ? disposableMsg : (error.message || (isEnglish ? 'Try again.' : 'Tenta novamente.')),
        variant: 'destructive',
      });
    } else {
      toast({
        title: isEnglish ? 'Account created!' : 'Conta criada!',
        description: isEnglish ? 'Welcome to PromptForge.' : 'Bem-vindo ao PromptForge.',
      });
      navigate('/');
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
          <span className="text-xl font-bold text-foreground">
            Prompt<span className="text-primary">Forge</span>
          </span>
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{isEnglish ? 'Create account' : 'Criar conta'}</CardTitle>
            <CardDescription>
              {isEnglish ? 'Start creating professional prompts' : 'Começa a criar prompts profissionais'}
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
                    placeholder={isEnglish ? 'Minimum 6 characters' : 'Mínimo 6 caracteres'}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{isEnglish ? 'Confirm password' : 'Confirmar palavra-passe'}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isEnglish ? 'Repeat password' : 'Repetir palavra-passe'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? (isEnglish ? 'Creating account...' : 'A criar conta...') : (isEnglish ? 'Create account' : 'Criar conta')}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{isEnglish ? 'Already have an account? ' : 'Já tens conta? '}</span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                {isEnglish ? 'Sign in' : 'Entrar'}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
