import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Target, FileText, Lightbulb, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const SCORE = 92;

export default function ExamplePromptShowcase() {
  const [showModal, setShowModal] = useState(false);
  const { t } = useTranslation();

  const improvements = t('showcase.improvements', { returnObjects: true }) as string[];

  return (
    <>
      <Card 
        className="border-border/50 hover:border-primary/40 transition-all cursor-pointer group"
        onClick={() => setShowModal(true)}
      >
        <CardContent className="p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm md:text-base">{t('showcase.cardTitle')}</span>
                  <Badge variant="secondary" className="text-xs bg-success/10 text-success border-0 shrink-0">
                    {SCORE}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {t('showcase.objective')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
              <span className="text-xs hidden sm:inline">{t('showcase.viewDetails')}</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Educational Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              {t('showcase.modalTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('showcase.modalDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Objective */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">{t('showcase.objectiveTitle')}</h3>
              </div>
              <p className="text-sm text-muted-foreground ml-10">
                "{t('showcase.objective')}"
              </p>
              <p className="text-xs text-success ml-10">
                {t('showcase.objectiveCheck')}
              </p>
            </div>

            {/* Structure */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                  <FileText className="h-4 w-4 text-info" />
                </div>
                <h3 className="font-semibold">{t('showcase.structureTitle')}</h3>
              </div>
              
              <div className="ml-10 space-y-3">
                <div className="rounded-lg border border-context/30 bg-context/5 p-3">
                  <p className="text-xs font-medium text-context mb-1">{t('showcase.contextLabel')}</p>
                  <p className="text-xs text-muted-foreground">{t('showcase.contextDesc')}</p>
                </div>
                
                <div className="rounded-lg border border-instruction/30 bg-instruction/5 p-3">
                  <p className="text-xs font-medium text-instruction mb-1">{t('showcase.instructionsLabel')}</p>
                  <p className="text-xs text-muted-foreground">{t('showcase.instructionsDesc')}</p>
                </div>
                
                <div className="rounded-lg border border-restriction/30 bg-restriction/5 p-3">
                  <p className="text-xs font-medium text-restriction mb-1">{t('showcase.restrictionsLabel')}</p>
                  <p className="text-xs text-muted-foreground">{t('showcase.restrictionsDesc')}</p>
                </div>
                
                <div className="rounded-lg border border-output/30 bg-output/5 p-3">
                  <p className="text-xs font-medium text-output mb-1">{t('showcase.outputLabel')}</p>
                  <p className="text-xs text-muted-foreground">{t('showcase.outputDesc')}</p>
                </div>
              </div>
            </div>

            {/* Why high score */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                  <Sparkles className="h-4 w-4 text-success" />
                </div>
                <h3 className="font-semibold">{t('showcase.whyHighScore', { score: SCORE })}</h3>
              </div>
              <ul className="ml-10 space-y-1">
                {improvements.map((improvement, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-success">✓</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
              <p className="text-sm font-medium mb-2">{t('showcase.ctaTitle')}</p>
              <Button onClick={() => setShowModal(false)} asChild>
                <a href="/builder">{t('showcase.ctaButton')}</a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
