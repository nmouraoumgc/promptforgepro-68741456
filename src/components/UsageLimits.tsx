import { useIsEnglish } from '@/i18n/lang';
export function UsageLimits() {
  const en=useIsEnglish();
  return <section className="mx-auto max-w-5xl rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2" aria-label={en?'How usage limits work':'Como funcionam os limites'}>
    <h2 className="font-semibold">{en?'What counts as an optimization or a run?':'O que é uma otimização e uma execução?'}</h2>
    <p>{en?'Generate creates a prompt from an idea. Optimize evaluates and improves a prompt: Free and Prompt Packs include 3 successful optimizations per prompt and 20 per account/day; Pro has no optimization cap. The daily optimization allowance resets at midnight Lisbon time.':'Gerar transforma uma ideia num prompt. Otimizar avalia e melhora um prompt: Free e Prompt Packs incluem 3 otimizações concluídas por prompt e 20 por conta/dia; o Pro não tem teto de otimizações. O teto diário renova à meia-noite de Lisboa.'}</p>
    <p>{en?'Run asks the AI for the final answer: Free and Prompt Packs include 5 runs per day; Pro includes 100 per day. Daily run allowances reset at midnight, Lisbon time.':'Executar pede à IA a resposta final: Free e Prompt Packs incluem 5 execuções por dia; o Pro inclui 100 por dia. As execuções diárias renovam à meia-noite, hora de Lisboa.'}</p>
    <p className="text-muted-foreground">{en?'Unlimited optimizations do not mean unlimited daily runs. Prompt Packs is a one-time purchase of content, not an upgrade to Pro tool limits.':'Otimizações ilimitadas não significam execuções diárias ilimitadas. Os Prompt Packs são uma compra única de conteúdos, sem aumento dos limites das ferramentas para Pro.'}</p>
  </section>;
}
