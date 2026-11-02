import { Wordmark } from '@/components/brand/Wordmark';
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore, RECOVERY_FLAG, initialAuthUrlError } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';

const hasRecoveryFlag = () => {
  try { return sessionStorage.getItem(RECOVERY_FLAG) === '1'; } catch { return false; }
};

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recovery, setRecovery] = useState<boolean>(hasRecoveryFlag());

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuthStore();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const settingNewPassword = recovery && !!user;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: isEnglish ? 'Error' : 'Erro',
        description: isEnglish ? 'Password must have at least 6 characters.' : 'A palavra-passe deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: isEnglish ? 'Error' : 'Erro',
        description: isEnglish ? 'Passwords do not match.' : 'As palavras-passe não coincidem.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      toast({
        title: isEnglish ? 'Could not change the password' : 'Não foi possível alterar a palavra-passe',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    try { sessionStorage.removeItem(RECOVERY_FLAG); } catch { /* ignore */ }
    toast({ title: isEnglish ? 'Password changed' : 'Palavra-passe alterada' });
    navigate('/app', { replace: true });
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

        {recovery && authLoading ? (
          <div className="min-h-[30vh]" aria-busy="true" />
        ) : settingNewPassword ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{isEnglish ? 'Set a new password' : 'Definir nova palavra-passe'}</CardTitle>
              <CardDescription>{isEnglish ? 'Choose a new password for your account.' : 'Escolhe uma nova palavra-passe para a tua conta.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{isEnglish ? 'New password' : 'Nova palavra-passe'}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="new-password" type={showPassword ? 'text' : 'password'} placeholder={isEnglish ? 'Minimum 6 characters' : 'Mínimo 6 caracteres'} value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10 pr-10 h-11" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">{isEnglish ? 'Confirm password' : 'Confirmar palavra-passe'}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirm-new-password" type={showPassword ? 'text' : 'password'} placeholder={isEnglish ? 'Repeat password' : 'Repetir palavra-passe'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="pl-10 h-11" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? (isEnglish ? 'Saving...' : 'A guardar...') : (isEnglish ? 'Save new password' : 'Guardar nova palavra-passe')}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{isEnglish ? 'Link invalid or expired' : 'Link inválido ou expirado'}</CardTitle>
              <CardDescription>
                {initialAuthUrlError
                  ? (isEnglish ? 'This recovery link is no longer valid. Request a new one.' : 'Este link de recuperação já não é válido. Pede um novo.')
                  : (isEnglish ? 'Open this page from the link in the recovery email.' : 'Abre esta página a partir do link no email de recuperação.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full h-11">
                <Link to="/forgot-password">{isEnglish ? 'Request a new link' : 'Pedir novo link'}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full h-11">
                <Link to="/login">{isEnglish ? 'Go to sign in' : 'Ir para entrar'}</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
