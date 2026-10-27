// "Criar": one screen for Quick (Rápido), Detailed (Detalhado, the guided builder) and
// "Otimizar prompt existente". Mode lives in ?mode= so old routes can redirect here.
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Wand2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsEnglish } from '@/i18n/lang';
import QuickPrompt from './QuickPrompt';
import GuidedBuilder from './GuidedBuilder';
import PromptOptimizer from './PromptOptimizer';

export type CreateMode = 'quick' | 'guided' | 'optimize';
const MODES: CreateMode[] = ['quick', 'guided', 'optimize'];

export default function Create() {
  const isEnglish = useIsEnglish();
  const [params, setParams] = useSearchParams();
  const raw = params.get('mode');
  const mode: CreateMode = MODES.includes(raw as CreateMode) ? (raw as CreateMode) : 'quick';
  const label = {
    quick: { icon: Zap, pt: 'Rápido', en: 'Quick', dpt: 'Uma ideia, um prompt pronto (também por voz)', den: 'One idea, one ready prompt (voice too)' },
    guided: { icon: Wand2, pt: 'Detalhado', en: 'Detailed', dpt: 'Passo a passo: objetivo, público, tom e formato', den: 'Step by step: goal, audience, tone and format' },
    optimize: { icon: Sparkles, pt: 'Otimizar prompt existente', en: 'Optimise existing prompt', dpt: 'Pontuação e versões melhoradas de um prompt teu', den: 'Score and improved versions of your own prompt' },
  } as const;

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{isEnglish ? 'Create' : 'Criar'}</h1>
        <p className="text-sm text-muted-foreground">{isEnglish ? label[mode].den : label[mode].dpt}</p>
      </header>
      <div role="tablist" className="inline-flex w-full sm:w-auto rounded-lg border border-border bg-muted/40 p-1 gap-1 overflow-x-auto" data-testid="create-modes">
        {MODES.map((m) => {
          const Icon = label[m].icon;
          return (
            <button key={m} type="button" role="tab" aria-selected={mode === m} data-testid={`mode-${m}`}
              onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.set('mode', m); return n; }, { replace: true })}
              className={cn('flex flex-1 sm:flex-none items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className={m === 'optimize' ? 'hidden sm:inline' : ''}>{isEnglish ? label[m].en : label[m].pt}</span>
              {m === 'optimize' && <span className="sm:hidden">{isEnglish ? 'Optimise' : 'Otimizar'}</span>}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" data-testid={`panel-${mode}`}>
        {mode === 'quick' && <QuickPrompt embedded />}
        {mode === 'guided' && <GuidedBuilder embedded />}
        {mode === 'optimize' && <PromptOptimizer embedded />}
      </div>
    </div>
  );
}
