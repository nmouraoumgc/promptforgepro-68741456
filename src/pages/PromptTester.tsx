import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlaskConical, ArrowLeftRight, Trophy, ThumbsUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { usePlanStore } from '@/stores/planStore';
import { useAuthStore } from '@/stores/authStore';
import { ProContextualUpsell, AuthGate } from '@/components/gating/FeatureGate';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function PromptTester() {
  const { t, i18n } = useTranslation();
  const { canAccess } = usePlanStore();
  const { user } = useAuthStore();
  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');
  const [responseA, setResponseA] = useState('');
  const [responseB, setResponseB] = useState('');
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  if (!user) {
    return (
      <div className="p-6 animate-fade-in">
        <Card>
          <AuthGate message={t('tester.authRequired')} />
        </Card>
      </div>
    );
  }

  if (!canAccess('canAccessABTesting')) {
    return (
      <div className="p-6 animate-fade-in">
        <Card>
          <ProContextualUpsell context="ab-testing" />
        </Card>
      </div>
    );
  }

  const runTest = async () => {
    if (!promptA || !promptB) return;
    setIsTesting(true);
    setWinner(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-prompts', {
        body: { promptA, promptB, language: i18n.language }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: t('tester.errorTitle'), description: data.error, variant: 'destructive' });
        setIsTesting(false);
        return;
      }

      setResponseA(data.responseA);
      setResponseB(data.responseB);

      const completed = localStorage.getItem('onboarding-completed');
      const steps = completed ? JSON.parse(completed) : [];
      if (!steps.includes('compare')) {
        localStorage.setItem('onboarding-completed', JSON.stringify([...steps, 'compare']));
      }
    } catch (error) {
      console.error('Error testing prompts:', error);
      toast({ title: t('tester.errorTitle'), description: t('tester.errorDesc'), variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  const selectWinner = (choice: 'A' | 'B') => setWinner(choice);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5" />{t('tester.title')}</CardTitle>
          <CardDescription>{t('tester.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-lg px-3 py-1">A</Badge>
                <span className="font-medium">{t('tester.promptA')}</span>
                {winner === 'A' && <Trophy className="h-5 w-5 text-warning" />}
              </div>
              <Textarea placeholder={t('tester.placeholderA')} value={promptA} onChange={(e) => setPromptA(e.target.value)} className="min-h-[120px]" />
              {responseA && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-2">{t('tester.response')}</p>
                    <p className="text-sm text-muted-foreground">{responseA}</p>
                  </CardContent>
                </Card>
              )}
              {responseA && !winner && (
                <Button variant="outline" className="w-full" onClick={() => selectWinner('A')}>
                  <ThumbsUp className="h-4 w-4 mr-2" />{t('tester.chooseA')}
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-lg px-3 py-1">B</Badge>
                <span className="font-medium">{t('tester.promptB')}</span>
                {winner === 'B' && <Trophy className="h-5 w-5 text-warning" />}
              </div>
              <Textarea placeholder={t('tester.placeholderB')} value={promptB} onChange={(e) => setPromptB(e.target.value)} className="min-h-[120px]" />
              {responseB && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-2">{t('tester.response')}</p>
                    <p className="text-sm text-muted-foreground">{responseB}</p>
                  </CardContent>
                </Card>
              )}
              {responseB && !winner && (
                <Button variant="outline" className="w-full" onClick={() => selectWinner('B')}>
                  <ThumbsUp className="h-4 w-4 mr-2" />{t('tester.chooseB')}
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <Button onClick={runTest} disabled={!promptA || !promptB || isTesting} size="lg">
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              {isTesting ? t('tester.testing') : t('tester.runTest')}
            </Button>
          </div>

          {winner && (
            <div className="text-center mt-6 p-4 rounded-lg bg-success/10">
              <Trophy className="h-8 w-8 mx-auto text-warning mb-2" />
              <p className="font-medium">{t('tester.winner', { winner })}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
