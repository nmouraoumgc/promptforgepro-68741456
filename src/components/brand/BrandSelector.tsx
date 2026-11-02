import { Link } from 'react-router-dom';
import { Palette, Settings2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useIsEnglish } from '@/i18n/lang';
import { useBrandMutations, useBrandProfiles } from '@/data/brandDb';
import { useToast } from '@/hooks/use-toast';

const NONE = '__none__';

/** Picks the active brand profile; the AI edge functions read it server-side. */
export function BrandSelector({ className }: { className?: string }) {
  const isEnglish = useIsEnglish();
  const { profiles, active, signedIn, isLoading } = useBrandProfiles();
  const { setActive } = useBrandMutations();
  const { toast } = useToast();
  if (!signedIn || isLoading) return null;

  if (profiles.length === 0) {
    return (
      <Link to="/brand" data-testid="brand-selector-empty"
        className={cn('inline-flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary', className)}>
        <Palette className="h-3.5 w-3.5" />
        {isEnglish ? 'Add your brand so the AI writes like you' : 'Junta a tua marca para a IA escrever como tu'}
      </Link>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)} data-testid="brand-selector">
      <Palette className="h-4 w-4 text-primary shrink-0" />
      <span className="text-xs text-muted-foreground hidden sm:inline">{isEnglish ? 'Brand:' : 'Marca:'}</span>
      <Select
        value={active?.id ?? NONE}
        onValueChange={(v) => {
          setActive.mutate(v === NONE ? null : v, {
            onSuccess: () => toast({
              title: v === NONE ? (isEnglish ? 'No brand' : 'Sem marca') : (isEnglish ? 'Brand activated' : 'Marca ativada'),
              description: v === NONE
                ? (isEnglish ? 'The AI will not use a brand profile.' : 'A IA não vai usar um perfil de marca.')
                : (isEnglish ? 'The AI will write with this brand profile.' : 'A IA vai escrever com este perfil de marca.'),
            }),
          });
        }}
      >
        <SelectTrigger className="h-8 w-auto min-w-[160px] max-w-[240px] text-xs" data-testid="brand-select-trigger">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.id} data-testid="brand-option">
              {p.name} <span className="text-muted-foreground">· {p.language.toUpperCase()}</span>
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NONE}>{isEnglish ? 'No brand' : 'Sem marca'}</SelectItem>
        </SelectContent>
      </Select>
      <Link to="/brand" className="text-muted-foreground hover:text-primary" title={isEnglish ? 'Manage brands' : 'Gerir marcas'} aria-label={isEnglish ? 'Manage brands' : 'Gerir marcas'}>
        <Settings2 className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default BrandSelector;
