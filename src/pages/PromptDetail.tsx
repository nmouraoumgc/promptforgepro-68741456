// Library prompt page: one prompt with tabs Executar / Otimizar / Testar / Versões.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, FlaskConical, GitBranch, Play, Sparkles, Star, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIsEnglish } from '@/i18n/lang';
import { useToast } from '@/hooks/use-toast';
import { usePromptStore } from '@/stores/promptStore';
import { usePageMeta } from '@/lib/pageMeta';
import { toPlainText } from '@/lib/plainText';
import { TemplateText } from '@/components/templates/TemplateFiller';
import { RunPrompt } from '@/components/run/RunPrompt';
import PromptOptimizer from './PromptOptimizer';
import PromptTester from './PromptTester';
import VersionHistory from './VersionHistory';

export type DetailTab = 'run' | 'optimize' | 'test' | 'versions';
const TABS: DetailTab[] = ['run', 'optimize', 'test', 'versions'];

export default function PromptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEnglish = useIsEnglish();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const prompt = usePromptStore((s) => s.prompts.find((p) => p.id === id));
  const { toggleFavorite, deletePrompt, addVersion, setActivePrompt } = usePromptStore();
  const raw = params.get('tab');
  const tab: DetailTab = TABS.includes(raw as DetailTab) ? (raw as DetailTab) : 'run';
  const [optKey, setOptKey] = useState(0);
  usePageMeta(prompt ? { title: prompt.title, description: prompt.description || prompt.title } : null, isEnglish);
  useEffect(() => { if (id) setActivePrompt(id); }, [id, setActivePrompt]);

  const previous = useMemo(() => {
    if (!prompt) return '';
    if (prompt.versions.length < 2) return '';
    const currentId = prompt.currentVersionId ?? prompt.versions[prompt.versions.length - 1].id;
    const others = prompt.versions.filter((v) => v.id !== currentId && v.content !== prompt.content);
    return others.length ? others[others.length - 1].content : '';
  }, [prompt]);

  if (!prompt) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center space-y-4">
        <p className="text-muted-foreground">{isEnglish ? 'This prompt is not in your library on this device.' : 'Este prompt não está na tua biblioteca neste dispositivo.'}</p>
        <Button asChild variant="outline"><Link to="/library">{isEnglish ? 'Back to library' : 'Voltar à biblioteca'}</Link></Button>
      </div>
    );
  }

  const label = {
    run: { icon: Play, pt: 'Executar', en: 'Run' },
    optimize: { icon: Sparkles, pt: 'Otimizar', en: 'Optimise' },
    test: { icon: FlaskConical, pt: 'Testar', en: 'Test' },
    versions: { icon: GitBranch, pt: 'Versões', en: 'Versions' },
  } as const;
  const setTab = (t: DetailTab) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', t); return n; }, { replace: true });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 animate-fade-in" data-testid="prompt-detail">
      <Link to="/library" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />{isEnglish ? 'Library' : 'Biblioteca'}
      </Link>
      <header className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold break-words">{prompt.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{prompt.category}</Badge>
            <Badge variant="secondary">{isEnglish ? `${prompt.versions.length} version${prompt.versions.length === 1 ? '' : 's'}` : `${prompt.versions.length} ${prompt.versions.length === 1 ? 'versão' : 'versões'}`}</Badge>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => { navigator.clipboard.writeText(toPlainText(prompt.content)); toast({ title: isEnglish ? 'Copied!' : 'Copiado!' }); }} data-testid="detail-copy">
            <Copy className="h-4 w-4" />{isEnglish ? 'Copy' : 'Copiar'}
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => toggleFavorite(prompt.id)} aria-label={isEnglish ? 'Favourite' : 'Favorito'}>
            <Star className={cn('h-4 w-4', prompt.isFavorite && 'fill-warning text-warning')} />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 text-destructive" aria-label={isEnglish ? 'Delete' : 'Apagar'}
            onClick={() => { if (window.confirm(isEnglish ? 'Delete this prompt?' : 'Apagar este prompt?')) { deletePrompt(prompt.id); navigate('/library'); } }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <Card><CardContent className="p-4 max-h-64 overflow-auto">
        <TemplateText template={prompt.content} isEnglish={isEnglish} className="text-sm whitespace-pre-wrap" />
      </CardContent></Card>

      <div role="tablist" className="grid grid-cols-4 rounded-lg border border-border bg-muted/40 p-1 gap-1" data-testid="detail-tabs">
        {TABS.map((t) => {
          const Icon = label[t].icon;
          return (
            <button key={t} type="button" role="tab" aria-selected={tab === t} data-testid={`tab-${t}`} onClick={() => setTab(t)}
              className={cn('flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs sm:text-sm font-medium transition-colors',
                tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <Icon className="h-4 w-4 shrink-0" /><span className="truncate">{isEnglish ? label[t].en : label[t].pt}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" data-testid={`detail-panel-${tab}`}>
        {tab === 'run' && <Card><CardContent className="p-4"><RunPrompt key={prompt.content} prompt={prompt.content} /></CardContent></Card>}
        {tab === 'optimize' && (
          <PromptOptimizer key={`${prompt.id}-${optKey}`} embedded initialPrompt={prompt.content}
            onSaveVersion={(content, lbl) => { addVersion(prompt.id, content, isEnglish ? `Optimised: ${lbl}` : `Otimizada: ${lbl}`); setOptKey((k) => k + 1); }} />
        )}
        {tab === 'test' && <PromptTester key={prompt.id} embedded initialA={prompt.content} initialB={previous} />}
        {tab === 'versions' && <VersionHistory embedded promptId={prompt.id} />}
      </div>
    </div>
  );
}
