import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sun, Crown, ArrowRight, Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePromptStore } from '@/stores/promptStore';
import { usePlanStore } from '@/stores/planStore';
import { PLAN_INFO } from '@/types/plans';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { darkMode, toggleDarkMode } = usePromptStore();
  const { currentPlan } = usePlanStore();
  const currentLang = (i18n.resolvedLanguage || i18n.language || 'pt').slice(0, 2);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    try {
      localStorage.setItem('pf_lang', lang);
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-2xl">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5" />{t('settings.currentPlan')}</CardTitle>
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
                <p className="text-sm text-muted-foreground">{(i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en') ? PLAN_INFO[currentPlan].taglineEn : PLAN_INFO[currentPlan].tagline}</p>
              </div>
            </div>
            <Link to="/pricing">
              <Button variant="outline" size="sm" className="gap-2">
                {t('settings.viewPlans')}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Languages className="h-5 w-5" />{t('settings.language')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('language.label')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
            </div>
            <Select value={currentLang} onValueChange={changeLanguage}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">🇵🇹 {t('language.pt')}</SelectItem>
                <SelectItem value="en">🇬🇧 {t('language.en')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sun className="h-5 w-5" />{t('settings.appearance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.darkMode')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.darkModeDesc')}</p>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
