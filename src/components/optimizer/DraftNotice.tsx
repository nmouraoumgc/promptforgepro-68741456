import { History, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

/** Small "Rascunho recuperado" notice with a "Limpar" action. */
export function DraftNotice({ onClear, onDismiss }: { onClear: () => void; onDismiss?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-sm" role="status" data-testid="draft-restored">
      <History className="h-4 w-4 text-info shrink-0" />
      <span className="font-medium">{t('optimizerFlow.draftRestored')}</span>
      <span className="text-xs text-muted-foreground hidden sm:inline">{t('optimizerFlow.draftHint')}</span>
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onClear} data-testid="draft-clear">{t('optimizerFlow.draftClear')}</Button>
        {onDismiss && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDismiss} aria-label="OK"><X className="h-3.5 w-3.5" /></Button>
        )}
      </div>
    </div>
  );
}
