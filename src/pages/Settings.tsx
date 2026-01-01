import { Link } from 'react-router-dom';
import { Sun, Crown, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { usePromptStore } from '@/stores/promptStore';
import { usePlanStore } from '@/stores/planStore';
import { PLAN_INFO } from '@/types/plans';

export default function Settings() {
  const { darkMode, toggleDarkMode } = usePromptStore();
  const { currentPlan } = usePlanStore();

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
    </div>
  );
}
