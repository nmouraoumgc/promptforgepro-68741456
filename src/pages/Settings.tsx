import { Settings as SettingsIcon, Moon, Sun, User, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { usePromptStore } from '@/stores/promptStore';

export default function Settings() {
  const { darkMode, toggleDarkMode, userProfile, setUserProfile } = usePromptStore();

  const profiles = [
    { value: 'beginner', label: '🎯 Iniciante', description: 'Interface simplificada com mais ajuda' },
    { value: 'content-creator', label: '✍️ Criador de Conteúdo', description: 'Focado em texto e redes sociais' },
    { value: 'developer', label: '💻 Programador', description: 'Otimizado para código' },
    { value: 'designer', label: '🎨 Designer', description: 'Focado em imagens e visual' },
    { value: 'business', label: '💼 Empresarial', description: 'Templates profissionais' },
  ] as const;

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-2xl">
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
