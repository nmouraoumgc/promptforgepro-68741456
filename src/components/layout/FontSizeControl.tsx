import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FONT_SIZES, getFontSize, setFontSize, subscribeFontSize, type FontSize } from '@/lib/fontSize';

const MARK: Record<FontSize, string> = { normal: 'A', large: 'A+', xlarge: 'A++' };

export function useFontSize(): FontSize {
  // Server/prerender snapshot is 'normal', so hydration of prerendered pages always matches.
  return useSyncExternalStore(subscribeFontSize, getFontSize, () => 'normal');
}

/** Header dropdown to choose the text size (A / A+ / A++). */
export function FontSizeControl() {
  const { t } = useTranslation();
  const current = useFontSize();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 px-2" aria-label={t('fontSize.label')} title={t('fontSize.label')} data-testid="font-size-control">
          <Type className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{t('fontSize.label')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {FONT_SIZES.map((size) => (
          <DropdownMenuItem
            key={size}
            onClick={() => setFontSize(size)}
            className="cursor-pointer"
            aria-label={t(`fontSize.${size}`)}
            aria-current={current === size ? 'true' : undefined}
            data-testid={`font-size-${size}`}
          >
            <span className="mr-2 w-8 font-semibold" aria-hidden="true">{MARK[size]}</span>
            <span className="flex-1">{t(`fontSize.${size}`)}</span>
            {current === size && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Inline 3-step segmented control (for the Settings page). */
export function FontSizeSegmented() {
  const { t } = useTranslation();
  const current = useFontSize();
  return (
    <div role="radiogroup" aria-label={t('fontSize.label')} className="inline-flex rounded-md border border-border p-0.5">
      {FONT_SIZES.map((size) => (
        <button
          key={size}
          type="button"
          role="radio"
          aria-checked={current === size}
          aria-label={t(`fontSize.${size}`)}
          title={t(`fontSize.${size}`)}
          onClick={() => setFontSize(size)}
          className={`min-w-[2.75rem] rounded px-2 py-1 text-sm font-semibold transition-colors ${current === size ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          {MARK[size]}
        </button>
      ))}
    </div>
  );
}
