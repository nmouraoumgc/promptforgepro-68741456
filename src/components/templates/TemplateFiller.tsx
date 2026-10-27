import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { toPlainText } from '@/lib/plainText';
import { extractVars, fillTemplate, templateParts, varLabel } from '@/lib/templateVariables';

/** Read-only template text with {{vars}} shown as highlighted [FRIENDLY LABEL] (or filled values). */
export function TemplateText({ template, values = {}, isEnglish, className }: {
  template: string; values?: Record<string, string>; isEnglish: boolean; className?: string;
}) {
  const parts = useMemo(() => templateParts(template, values, isEnglish), [template, values, isEnglish]);
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
export function TemplateFiller({ template, isEnglish, idPrefix }: { template: string; isEnglish: boolean; idPrefix: string }) {
  const { toast } = useToast();
  const vars = useMemo(() => extractVars(template), [template]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState('');
  const missing = vars.filter((v) => !(values[v] ?? '').trim());

  const copy = async () => {
    await navigator.clipboard.writeText(toPlainText(fillTemplate(template, values, isEnglish)));
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
      description: h || (isEnglish ? 'Template copied to clipboard.' : 'Template copiado para a área de transferência.'),
    });
  };

  return (
    <div className="space-y-3" data-testid="template-filler">
      {vars.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {vars.map((v) => {
            const { label, example } = varLabel(v, isEnglish);
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
        <TemplateText template={template} values={values} isEnglish={isEnglish} className="text-foreground/90" />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite" data-testid="copy-hint">{hint}</p>
        <Button variant="outline" size="sm" onClick={copy} className="w-full sm:w-auto shrink-0">
          {copied ? <Check className="h-4 w-4 mr-2 text-primary" /> : <Copy className="h-4 w-4 mr-2" />}
          {isEnglish ? 'Copy' : 'Copiar'}
        </Button>
      </div>
    </div>
  );
}
