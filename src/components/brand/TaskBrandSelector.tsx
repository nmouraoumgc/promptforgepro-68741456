import type { ReactNode } from 'react';
import { TaskBrandContext, useLocalTaskBrand, useTaskBrand } from './taskBrandContext';
import { Link } from 'react-router-dom';
import { useIsEnglish } from '@/i18n/lang';
import { brandConflict, taskBrandFields } from '@/lib/taskBrand';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export function TaskBrandProvider({ children }: { children: ReactNode }) {
  const value = useLocalTaskBrand();
  return <TaskBrandContext.Provider value={value}>{children}</TaskBrandContext.Provider>;
}
export function TaskBrandSelector({ request = '', className }: { request?: string; className?: string }) {
  const { brand, profiles, setSelection, isLoading } = useTaskBrand();
  const en = useIsEnglish();
  const fields = brand ? taskBrandFields(brand) : null;
  return <section className={className} aria-label={en ? 'Brand for this task' : 'Marca para esta tarefa'} data-testid="task-brand">
    <label className="block text-sm font-medium mb-2" htmlFor="task-brand-choice">{en ? 'Brand for this task' : 'Marca para esta tarefa'}</label>
    <Select value={brand?.id ?? '__none__'} onValueChange={value => setSelection(value==='__none__' ? null : value)} disabled={isLoading}>
      <SelectTrigger id="task-brand-choice" className="max-w-sm"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{en ? 'No brand' : 'Sem marca'}</SelectItem>
        {profiles.map(p=><SelectItem key={p.id} value={p.id}>{en ? 'This brand' : 'Esta marca'}: {p.name}</SelectItem>)}
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground mt-2">{en ? 'Applies to the next generation in this task. Your account’s active brand stays unchanged.' : 'Aplica-se à próxima geração nesta tarefa. Não altera a marca ativa da conta.'}</p>
    {fields ? <details className="mt-2 rounded border p-3 text-xs" open>
      <summary className="cursor-pointer font-medium">{en ? 'Context included' : 'Contexto incluído'}</summary>
      <dl className="mt-2 space-y-1 whitespace-pre-wrap break-words">
        {[[en?'Brand':'Marca',fields.name],[en?'Product/service':'Produto/serviço',fields.offering],[en?'Audience':'Público',fields.audience],[en?'Tone':'Tom',fields.tone],[en?'Keywords':'Palavras-chave',fields.keywords],[en?'Forbidden words':'Palavras proibidas',fields.forbidden],[en?'Brand language':'Idioma da marca',fields.language.toUpperCase()]].map(([label,value])=>value ? <div key={label}><dt className="inline font-medium">{label}: </dt><dd className="inline">{value}</dd></div> : null)}
      </dl>
    </details> : <p className="text-xs text-muted-foreground mt-2">{en?'No saved brand context will be included.':'Não será incluído contexto de uma marca guardada.'}</p>}
    {brandConflict(brand,request) && <p role="alert" className="mt-2 rounded border border-warning/50 bg-warning/10 p-3 text-sm" data-testid="brand-conflict">{en?'Possible conflict: the task’s sector or requested language differs from this brand. Review the context or choose No brand.':'Possível conflito: o setor ou o idioma pedido difere desta marca. Revê o contexto ou escolhe Sem marca.'}</p>}
    {profiles.length===0 && <Link to="/brand" className="text-xs underline">{en?'Manage brands':'Gerir marcas'}</Link>}
  </section>;
}
