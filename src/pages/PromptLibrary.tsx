import { useState } from 'react';
import { TemplateText } from '@/components/templates/TemplateFiller';
import { useIsEnglish } from '@/i18n/lang';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Star, Grid, List, Plus, Copy, Trash2, MoreHorizontal, Play, Sparkles, FlaskConical, GitBranch, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { usePromptStore } from '@/stores/promptStore';
import { CATEGORIES, Category } from '@/types/prompt';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function PromptLibrary() {
  const isEnglishUi = useIsEnglish();
  const { t, i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
  const { prompts, toggleFavorite, deletePrompt, duplicatePrompt } = usePromptStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();
  const [params] = useSearchParams();
  const hint = params.get('hint');

  const filteredPrompts = prompts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDuplicate = (id: string) => {
    duplicatePrompt(id);
    toast({ title: t('library.duplicated'), description: t('library.duplicatedDesc') });
  };

  const handleDelete = (id: string) => {
    deletePrompt(id);
    toast({ title: t('library.deleted'), description: t('library.deletedDesc') });
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('library.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" aria-label={isEnglishUi ? 'Grid view' : 'Vista em grelha'} onClick={() => setViewMode('grid')}><Grid className="h-4 w-4" /></Button>
          <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" aria-label={isEnglishUi ? 'List view' : 'Vista em lista'} onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
          <Link to="/create"><Button><Plus className="h-4 w-4 mr-2" />{t('library.newPrompt')}</Button></Link>
        </div>
      </div>

      {(hint === 'test' || hint === 'versions') && (
        <div className="rounded-lg border border-info/30 bg-info/10 p-3 text-sm flex items-start gap-2" data-testid="library-hint">
          <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <span>
            {hint === 'test'
              ? (isEnglishUi ? 'A/B testing now lives inside each prompt: open a prompt and choose the Test tab.' : 'O teste A/B está agora dentro de cada prompt: abre um prompt e escolhe o separador Testar.')
              : (isEnglishUi ? 'Version history now lives inside each prompt: open a prompt and choose the Versions tab.' : 'O histórico de versões está agora dentro de cada prompt: abre um prompt e escolhe o separador Versões.')}
            {prompts.length === 0 && (isEnglishUi ? ' Create your first prompt to start.' : ' Cria o teu primeiro prompt para começar.')}
          </span>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Badge variant={selectedCategory === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedCategory('all')}>{t('library.all')}</Badge>
        {CATEGORIES.map(cat => (
          <Badge key={cat.value} variant={selectedCategory === cat.value ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedCategory(cat.value)}>
            {isEnglish ? ({
              writing: 'Writing',
              code: 'Code',
              image: 'Image',
              video: 'Video',
              audio: 'Audio',
              business: 'Business',
              education: 'Education',
              creative: 'Creative',
              'social-media': 'Social Media',
              other: 'Other',
              marketing: 'Marketing',
              email: 'Email',
            } as Record<string, string>)[cat.value] || cat.label : cat.label}
          </Badge>
        ))}
      </div>

      {filteredPrompts.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">{t('library.empty')}</p>
            <Link to="/create"><Button>{t('library.createNew')}</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3')}>
          {filteredPrompts.map(prompt => (
            <Card key={prompt.id} className="group hover:border-primary/50 transition-all" data-testid="library-card">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base truncate flex-1 min-w-0"><Link to={`/library/${prompt.id}`} className="hover:text-primary" data-testid="library-open">{prompt.title}</Link></CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={isEnglishUi ? 'Toggle favourite' : 'Marcar como favorito'} onClick={() => toggleFavorite(prompt.id)}>
                      <Star className={cn("h-4 w-4", prompt.isFavorite && "fill-warning text-warning")} />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={isEnglishUi ? 'More actions' : 'Mais ações'}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleDuplicate(prompt.id)}><Copy className="h-4 w-4 mr-2" />{t('library.duplicate')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(prompt.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />{t('library.delete')}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TemplateText template={prompt.content} isEnglish={isEnglishUi} className="text-muted-foreground line-clamp-3 mb-3" />
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{prompt.category}</Badge>
                  {prompt.tags.slice(0, 2).map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>
                <div className="grid grid-cols-4 gap-1 pt-3">
                  {([['run', Play, 'Executar', 'Run'], ['optimize', Sparkles, 'Otimizar', 'Optimise'], ['test', FlaskConical, 'Testar', 'Test'], ['versions', GitBranch, 'Versões', 'Versions']] as const).map(([tab, Icon, pt, en]) => (
                    <Link key={tab} to={`/library/${prompt.id}?tab=${tab}`} data-testid={`library-${tab}`}
                      className="flex flex-col items-center gap-0.5 rounded-md py-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Icon className="h-3.5 w-3.5" />{isEnglishUi ? en : pt}
                    </Link>
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
