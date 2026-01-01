import { Moon, Sun, User, Crown, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { usePromptStore } from '@/stores/promptStore';
import { usePlanStore } from '@/stores/planStore';
import { PLAN_INFO, PlanType } from '@/types/plans';

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

  const plans: { value: PlanType; features: string[] }[] = [
    { value: 'free', features: ['Criar prompts ilimitados', '3 otimizações por prompt', 'Score básico'] },
    { value: 'pro', features: ['Otimizações ilimitadas', 'Histórico de versões', 'Teste A/B', 'Score detalhado', 'Exportar prompts'] },
    { value: 'premium', features: ['Tudo do Pro', 'Prompt Packs', 'Templates profissionais', 'Acesso antecipado'] },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-2xl">
      {/* Plan Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5" />Plano</CardTitle>
          <CardDescription>Gere o teu plano e funcionalidades</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {plans.map(plan => (
            <div
              key={plan.value}
              onClick={() => setPlan(plan.value)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                currentPlan === plan.value 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${PLAN_INFO[plan.value].color}`}>
                    {PLAN_INFO[plan.value].name}
                  </span>
                  <Badge variant="outline" className="text-xs">{PLAN_INFO[plan.value].tagline}</Badge>
                </div>
                {currentPlan === plan.value && <Check className="h-4 w-4 text-primary" />}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {plan.features.map((f, i) => (
                  <span key={i} className="text-xs text-muted-foreground">• {f}</span>
                ))}
              </div>
            </div>
          ))}
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
