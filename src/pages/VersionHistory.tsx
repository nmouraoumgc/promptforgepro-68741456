import { GitBranch, Clock, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePromptStore } from '@/stores/promptStore';
import { usePlanStore } from '@/stores/planStore';
import { useAuthStore } from '@/stores/authStore';
import { ProContextualUpsell, AuthGate } from '@/components/gating/FeatureGate';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function VersionHistory() {
  const { prompts, revertToVersion } = usePromptStore();
  const { canAccess } = usePlanStore();
  const { user } = useAuthStore();
  const promptsWithVersions = prompts.filter(p => p.versions.length > 1);

  // Require authentication first
  if (!user) {
    return (
      <div className="p-6 animate-fade-in">
        <Card>
          <AuthGate message="Cria uma conta gratuita para aceder ao histórico de versões." />
        </Card>
      </div>
    );
  }

  // Gate version history for non-premium users
  if (!canAccess('canAccessVersionHistory')) {
    return (
      <div className="p-6 animate-fade-in">
        <Card>
          <ProContextualUpsell context="version-history" />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {promptsWithVersions.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Ainda não tens prompts com múltiplas versões</p>
            <p className="text-sm text-muted-foreground mt-2">Edita os teus prompts para criar histórico de versões</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {promptsWithVersions.map(prompt => (
            <Card key={prompt.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" />{prompt.title}</CardTitle>
                <CardDescription>{prompt.versions.length} versões</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6 border-l-2 border-muted space-y-4">
                  {prompt.versions.map((version, index) => (
                    <div key={version.id} className="relative">
                      <div className="absolute -left-[25px] h-4 w-4 rounded-full bg-primary border-2 border-background" />
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{version.label || `Versão ${index + 1}`}</span>
                            {prompt.currentVersionId === version.id && <Badge>Atual</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(version.createdAt), "d MMM yyyy 'às' HH:mm", { locale: pt })}
                          </p>
                          <p className="text-sm mt-2 line-clamp-2">{version.content}</p>
                        </div>
                        {prompt.currentVersionId !== version.id && (
                          <Button variant="outline" size="sm" onClick={() => revertToVersion(prompt.id, version.id)}>
                            <RotateCcw className="h-3 w-3 mr-1" />Reverter
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
