import { Link } from 'react-router-dom';
import { Sun, User, Crown, Check, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { usePromptStore } from '@/stores/promptStore';
import { usePlanStore } from '@/stores/planStore';
import { PLAN_INFO } from '@/types/plans';

export default function Settings() {
  const { darkMode, toggleDarkMode, userProfile, setUserProfile } = usePromptStore();
  const { currentPlan, setPlan } = usePlanStore();

  const profiles = [
    { value: 'beginner', label: '🎯 Iniciante', description: 'Interface simplificada com mais ajuda' },
    { value: 'content-creator', label: '✍️ Criador de Conteúdo', description: 'Focado em texto e redes sociais' },
    { value: 'developer', label: '💻 Programador', description: 'Otimizado para código' },
    { value: 'designer', label: '🎨 Designer', description: 'Focado em imagens e visual' },
    { value: 'business', label: '💼 Empresarial', description: 'Templates profissionais' },
  ] as const;

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-2xl">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5" />Plano Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                currentPlan === 'free' 
                  ? 'bg-muted' 
                  : currentPlan === 'pro' 
                  ? 'bg-info/10' 
                  : 'bg-primary/10'
              }`}>
                <Crown className={`h-5 w-5 ${PLAN_INFO[currentPlan].color}`} />
              </div>
              <div>
                <p className={`font-semibold ${PLAN_INFO[currentPlan].color}`}>
                  {PLAN_INFO[currentPlan].name}
                </p>
                <p className="text-sm text-muted-foreground">{PLAN_INFO[currentPlan].tagline}</p>
              </div>
            </div>
            <Link to="/pricing">
              <Button variant="outline" size="sm" className="gap-2">
                Ver planos
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sun className="h-5 w-5" />Aparência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Modo Escuro</p>
              <p className="text-sm text-muted-foreground">Alternar entre tema claro e escuro</p>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Perfil de Utilizador</CardTitle>
          <CardDescription>A interface adapta-se ao teu perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {profiles.map(profile => (
            <div
              key={profile.value}
              onClick={() => setUserProfile(profile.value)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${userProfile === profile.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <p className="font-medium">{profile.label}</p>
              <p className="text-sm text-muted-foreground">{profile.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
