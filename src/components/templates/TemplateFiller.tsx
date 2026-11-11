import { useMemo, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { toPlainText } from '@/lib/plainText';
import { extractVars, fillTemplate, templateParts, varLabel, type LabelOverrides } from '@/lib/templateVariables';

/** Read-only template text with {{vars}} shown as highlighted [FRIENDLY LABEL] (or filled values). */
export function TemplateText({ template, values = {}, isEnglish, className, labels }: {
  template: string; values?: Record<string, string>; isEnglish: boolean; className?: string; labels?: LabelOverrides;
}) {
  const parts = useMemo(() => templateParts(template, values, isEnglish, labels), [template, values, isEnglish, labels]);
  return (
    <p className={cn('text-sm whitespace-pre-wrap break-words', className)} data-testid="template-text">
      {parts.map((p, i) =>
        p.varName ? (
          <mark
            key={i}
            data-filled={p.filled ? '1' : '0'}
            className={cn(
              'rounded px-1 font-medium',
              p.filled ? 'bg-primary/15 text-foreground' : 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200',
            )}
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  );
}

/** Inline form: one field per {{variable}}, live preview, and copy of the filled text. */
export function TemplateFiller({ template, isEnglish, idPrefix, labels, extraActions }: {
  template: string; isEnglish: boolean; idPrefix: string;
  /** Per-template label overrides: { varName: [label, example] }. */
  labels?: LabelOverrides;
  /** Extra buttons rendered next to Copy; receives the current filled plain text. */
  extraActions?: (filledText: string, missingCount: number) => ReactNode;
}) {
  const { toast } = useToast();
  const vars = useMemo(() => extractVars(template), [template]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState('');
  const missing = vars.filter((v) => !(values[v] ?? '').trim());

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toPlainText(fillTemplate(template, values, isEnglish, labels)));
    } catch {
      setCopied(false);
      setHint(isEnglish ? 'Copy failed. Please allow clipboard access and try again.' : 'Não foi possível copiar. Autoriza o acesso à área de transferência e tenta novamente.');
      toast({
        variant: 'destructive',
        title: isEnglish ? 'Could not copy' : 'Não foi possível copiar',
        description: isEnglish ? 'Allow clipboard access and try again.' : 'Autoriza o acesso à área de transferência e tenta novamente.',
      });
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    const h = missing.length
      ? isEnglish
        ? `Copied. ${missing.length} field${missing.length > 1 ? 's are' : ' is'} still empty and will appear in [BRACKETS]; you can fill ${missing.length > 1 ? 'them' : 'it'} in later.`
        : `Copiado. ${missing.length > 1 ? `Ficaram ${missing.length} campos` : 'Ficou 1 campo'} por preencher, que ${missing.length > 1 ? 'aparecem' : 'aparece'} entre [PARÊNTESES RETOS]; podes completar depois.`
      : '';
    setHint(h);
    toast({
      title: isEnglish ? 'Copied!' : 'Copiado!',
      description: h || (isEnglish ? 'Template copied to clipboard.' : 'Modelo copiado para a área de transferência.'),
    });
  };

  return (
    <div className="space-y-3" data-testid="template-filler">
      {vars.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {vars.map((v) => {
            const { label, example } = varLabel(v, isEnglish, labels);
            const id = `${idPrefix}-${v}`;
            const long = /^(Cola aqui|Paste)/.test(example);
            const common = {
              id,
              value: values[v] ?? '',
              placeholder: example,
              onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((s) => ({ ...s, [v]: e.target.value })),
            };
            return (
              <div key={v} className={cn('space-y-1', long && 'sm:col-span-2')}>
                <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
                {long ? <Textarea rows={3} className="text-sm" {...common} /> : <Input className="h-9 text-sm" {...common} />}
              </div>
            );
          })}
        </div>
      )}

      <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
        <TemplateText template={template} values={values} isEnglish={isEnglish} labels={labels} className="text-foreground/90" />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite" data-testid="copy-hint">{hint}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {extraActions?.(toPlainText(fillTemplate(template, values, isEnglish, labels)), missing.length)}
          <Button variant="outline" size="sm" onClick={copy} className="w-full sm:w-auto shrink-0">
            {copied ? <Check className="h-4 w-4 mr-2 text-primary" /> : <Copy className="h-4 w-4 mr-2" />}
            {isEnglish ? 'Copy' : 'Copiar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
