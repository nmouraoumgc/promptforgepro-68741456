import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Palette, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AuthGate } from '@/components/gating/FeatureGate';
import { useAuthStore } from '@/stores/authStore';
import { useIsEnglish } from '@/i18n/lang';
import { useToast } from '@/hooks/use-toast';
import { BrandInput, BrandProfile, isBrandLimitError, useBrandLimit, useBrandMutations, useBrandProfiles } from '@/data/brandDb';

const splitList = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 30);
const empty = (en: boolean): BrandInput => ({ name: '', tone: '', audience: '', offering: '', keywords: [], forbidden_words: [], language: en ? 'en' : 'pt' });

export default function BrandKit() {
  const isEnglish = useIsEnglish();
  const user = useAuthStore((s) => s.user);
  const plan = useAuthStore((s) => s.profile?.current_plan ?? 'free');
  const limit = useBrandLimit();
  const { profiles, isLoading } = useBrandProfiles();
  const { create, update, remove, setActive } = useBrandMutations();
  const { toast } = useToast();
  const [editing, setEditing] = useState<(BrandInput & { id?: string }) | null>(null);
  const [kw, setKw] = useState(''); const [fw, setFw] = useState('');

  if (!user) {
    return <div className="p-6"><Card><AuthGate message={isEnglish ? 'Create a free account to save your brand.' : 'Cria uma conta grátis para guardares a tua marca.'} /></Card></div>;
  }

  const atLimit = profiles.length >= limit;
  const open = (p?: BrandProfile) => {
    const base = p ? { id: p.id, name: p.name, tone: p.tone, audience: p.audience, offering: p.offering, keywords: p.keywords, forbidden_words: p.forbidden_words, language: p.language } : empty(isEnglish);
    setEditing(base); setKw(base.keywords.join(', ')); setFw(base.forbidden_words.join(', '));
  };
  const save = async () => {
    if (!editing || !editing.name.trim()) return;
    const row: BrandInput = { ...editing, name: editing.name.trim(), keywords: splitList(kw), forbidden_words: splitList(fw) };
    try {
      if (editing.id) await update.mutateAsync({ ...row, id: editing.id });
      else await create.mutateAsync({ ...row, makeActive: profiles.every((p) => !p.is_active) });
      setEditing(null);
      toast({ title: isEnglish ? 'Brand saved' : 'Marca guardada' });
    } catch (e) {
      toast({
        title: isEnglish ? 'Could not save' : 'Não foi possível guardar',
        description: isBrandLimitError(e)
          ? (isEnglish ? `Your plan allows ${limit} brand profile${limit === 1 ? '' : 's'}.` : `O teu plano permite ${limit} perfi${limit === 1 ? 'l' : 's'} de marca.`)
          : (isEnglish ? 'Try again.' : 'Tenta novamente.'),
        variant: 'destructive',
      });
    }
  };
  const limitLabel = limit === Infinity ? (isEnglish ? 'unlimited' : 'ilimitados') : String(limit);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary"><Palette className="h-5 w-5" /><span className="text-sm font-medium">{isEnglish ? 'Brand Kit' : 'Cofre de marca'}</span></div>
        <h1 className="text-2xl sm:text-3xl font-bold">{isEnglish ? 'Make the AI write like your brand' : 'Põe a IA a escrever como a tua marca'}</h1>
        <p className="text-muted-foreground max-w-2xl">
          {isEnglish
            ? 'Save your tone of voice, audience, product and words to avoid. The active brand is used automatically in Create, Optimize and Pack previews.'
            : 'Guarda o teu tom de voz, público, produto e as palavras a evitar. A marca ativa é usada automaticamente no Criar, no Otimizar e nas pré-visualizações dos Packs.'}
        </p>
        <p className="text-xs text-muted-foreground" data-testid="brand-count">
          {isEnglish ? `${profiles.length} of ${limitLabel} profiles used (${plan} plan)` : `${profiles.length} de ${limitLabel} perfis usados (plano ${plan})`}
        </p>
      </header>

      {isLoading ? <Skeleton className="h-32" /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {profiles.map((p) => (
            <Card key={p.id} className={p.is_active ? 'border-primary/60' : ''} data-testid="brand-card" data-active={p.is_active ? '1' : '0'}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.language === 'en' ? 'English' : 'Português (PT)'}</p>
                  </div>
                  {p.is_active && <Badge className="gap-1 shrink-0"><CheckCircle2 className="h-3 w-3" />{isEnglish ? 'Active' : 'Ativa'}</Badge>}
                </div>
                {p.offering && <p className="text-sm text-muted-foreground line-clamp-2">{p.offering}</p>}
                {p.tone && <p className="text-xs"><span className="text-muted-foreground">{isEnglish ? 'Tone: ' : 'Tom: '}</span>{p.tone}</p>}
                {p.forbidden_words.length > 0 && <p className="text-xs"><span className="text-muted-foreground">{isEnglish ? 'Avoid: ' : 'Evitar: '}</span>{p.forbidden_words.join(', ')}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {!p.is_active
                    ? <Button size="sm" onClick={() => setActive.mutate(p.id)} data-testid="brand-activate">{isEnglish ? 'Use this brand' : 'Usar esta marca'}</Button>
                    : <Button size="sm" variant="outline" onClick={() => setActive.mutate(null)}>{isEnglish ? 'Stop using' : 'Deixar de usar'}</Button>}
                  <Button size="sm" variant="outline" onClick={() => open(p)} className="gap-1" data-testid="brand-edit"><Pencil className="h-3.5 w-3.5" />{isEnglish ? 'Edit' : 'Editar'}</Button>
                  <Button size="sm" variant="ghost" className="gap-1 text-destructive" data-testid="brand-delete"
                    onClick={() => { if (window.confirm(isEnglish ? `Delete "${p.name}"?` : `Apagar "${p.name}"?`)) remove.mutate(p.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />{isEnglish ? 'Delete' : 'Apagar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!atLimit ? (
            <button type="button" onClick={() => open()} data-testid="brand-new"
              className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary">
              <Plus className="h-6 w-6" />{isEnglish ? 'New brand profile' : 'Novo perfil de marca'}
            </button>
          ) : (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent" data-testid="brand-limit">
              <CardContent className="p-4 space-y-2">
                <p className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />{isEnglish ? 'Need more brands?' : 'Precisas de mais marcas?'}</p>
                <p className="text-sm text-muted-foreground">
                  {plan === 'pro'
                    ? (isEnglish ? 'Pro includes 3 brand profiles. Premium has no limit.' : 'O Pro inclui 3 perfis de marca. O Premium não tem limite.')
                    : (isEnglish ? 'Free includes 1 brand profile. Pro gives you 3, Premium unlimited.' : 'O plano grátis inclui 1 perfil de marca. O Pro dá-te 3 e o Premium ilimitados.')}
                </p>
                <Button asChild size="sm"><Link to="/pricing">{isEnglish ? 'See plans' : 'Ver planos'}</Link></Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? (isEnglish ? 'Edit brand' : 'Editar marca') : (isEnglish ? 'New brand profile' : 'Novo perfil de marca')}</DialogTitle>
            <DialogDescription>{isEnglish ? 'Short, concrete answers work best.' : 'Respostas curtas e concretas funcionam melhor.'}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3" data-testid="brand-form">
              <div className="space-y-1"><Label htmlFor="b-name">{isEnglish ? 'Brand name' : 'Nome da marca'} *</Label>
                <Input id="b-name" maxLength={80} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder={isEnglish ? 'e.g. Sunrise Bakery' : 'ex.: Pastelaria Doce Braga'} /></div>
              <div className="space-y-1"><Label htmlFor="b-off">{isEnglish ? 'Product or service' : 'Produto ou serviço'}</Label>
                <Textarea id="b-off" maxLength={800} rows={2} value={editing.offering} onChange={(e) => setEditing({ ...editing, offering: e.target.value })} placeholder={isEnglish ? 'e.g. Artisan bread and cakes, delivery in town' : 'ex.: Pão e bolos artesanais, entrega na cidade'} /></div>
              <div className="space-y-1"><Label htmlFor="b-aud">{isEnglish ? 'Audience' : 'Público'}</Label>
                <Input id="b-aud" maxLength={500} value={editing.audience} onChange={(e) => setEditing({ ...editing, audience: e.target.value })} placeholder={isEnglish ? 'e.g. Local families and offices' : 'ex.: Famílias e escritórios da zona'} /></div>
              <div className="space-y-1"><Label htmlFor="b-tone">{isEnglish ? 'Tone of voice' : 'Tom de voz'}</Label>
                <Input id="b-tone" maxLength={500} value={editing.tone} onChange={(e) => setEditing({ ...editing, tone: e.target.value })} placeholder={isEnglish ? 'e.g. Warm, simple, a little playful' : 'ex.: Próximo, simples, com um toque de humor'} /></div>
              <div className="space-y-1"><Label htmlFor="b-kw">{isEnglish ? 'Keywords (comma separated)' : 'Palavras-chave (separadas por vírgulas)'}</Label>
                <Input id="b-kw" value={kw} onChange={(e) => setKw(e.target.value)} placeholder={isEnglish ? 'e.g. sourdough, local, fresh daily' : 'ex.: massa-mãe, local, fresco todos os dias'} /></div>
              <div className="space-y-1"><Label htmlFor="b-fw">{isEnglish ? 'Forbidden words' : 'Palavras proibidas'}</Label>
                <Input id="b-fw" value={fw} onChange={(e) => setFw(e.target.value)} placeholder={isEnglish ? 'e.g. cheap, best ever' : 'ex.: barato, o melhor de sempre'} /></div>
              <div className="space-y-1"><Label>{isEnglish ? 'Language of the texts' : 'Idioma dos textos'}</Label>
                <Select value={editing.language} onValueChange={(v) => setEditing({ ...editing, language: v as 'pt' | 'en' })}>
                  <SelectTrigger data-testid="brand-lang"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pt">Português (PT)</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                </Select></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>{isEnglish ? 'Cancel' : 'Cancelar'}</Button>
            <Button onClick={save} disabled={!editing?.name.trim() || create.isPending || update.isPending} data-testid="brand-save">{isEnglish ? 'Save' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
