import { UsageLimits } from '@/components/UsageLimits';
import { VisitorCampaign } from '@/components/marketing/VisitorCampaign';
// Public landing page for logged-out visitors at "/". Signed-in users are sent to the app (/app) by Home.
// Kept free of heavy dependencies (no animation library) so it paints fast on mobile.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Flame, Sparkles, Wand2, Library, Gauge, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { FontSizeControl } from '@/components/layout/FontSizeControl';
import { useIsEnglish } from '@/i18n/lang';
import { Wordmark } from '@/components/brand/Wordmark';

const BEFORE = {
  pt: 'Uma publicação de Instagram para divulgar o almoço de um restaurante.',
  en: 'Write an Instagram post about my restaurant.',
};
const AFTER = {
  pt: `Atue como gestor de redes sociais de um restaurante familiar em Lisboa.
Objetivo: atrair clientes para o almoço de sexta-feira.
Público: pessoas que trabalham na zona, 25 a 45 anos.
Tom: próximo e descontraído, sem exageros.
Formato: legenda com até 80 palavras, 1 pergunta no fim e 3 hashtags locais.
Evite: promessas de preço e emojis em excesso.`,
  en: `Act as the social media manager of a family restaurant in Lisbon.
Goal: bring in customers for Friday lunch.
Audience: people who work nearby, aged 25 to 45.
Tone: friendly and relaxed, no hype.
Format: caption of up to 80 words, 1 question at the end and 3 local hashtags.
Avoid: price promises and too many emojis.`,
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PromptForge Pro',
  url: 'https://promptforgepro.me/',
  image: 'https://promptforgepro.me/og-image.png',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  inLanguage: ['pt-PT', 'en'],
  description: 'Cria, otimiza e guarda prompts profissionais para ChatGPT, Gemini e Claude, em português de Portugal.',
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'EUR' },
    { '@type': 'Offer', name: 'Pro', price: '9', priceCurrency: 'EUR', description: 'Subscrição mensal. Todas as ferramentas, todas as lições do Aprender e todos os Prompt Packs incluídos.' },
    { '@type': 'Offer', name: 'Pro anual', price: '90', priceCurrency: 'EUR', description: 'Subscrição anual (2 meses grátis). Tudo o que o Pro mensal inclui, com todos os Prompt Packs.' },
    { '@type': 'Offer', name: 'Prompt Packs', price: '19', priceCurrency: 'EUR', description: 'Pagamento único. Todos os Prompt Packs premium e todas as lições do Aprender. Não inclui as ferramentas do Pro.' },
  ],
};

/** Adds the SoftwareApplication JSON-LD while the landing page is mounted. */
function useJsonLd() {
  useEffect(() => {
    // Reuse the prerendered tag when present, so hydration does not duplicate it.
    const el = (document.getElementById('ld-software-application') as HTMLScriptElement | null) ?? document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'ld-software-application';
    el.text = JSON.stringify(JSON_LD);
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);
}

export default function Landing() {
  useJsonLd();
  const en = useIsEnglish();
  const L = (pt: string, eng: string) => (en ? eng : pt);

  const steps = [
    { icon: Wand2, title: L('Descreve o que precisas', 'Describe what you need'), text: L('Escreve a tua ideia em poucas palavras ou segue o modo guiado: objetivo, público, tom e formato.', 'Type your idea in a few words or follow the guided mode: goal, audience, tone and format.') },
    { icon: Sparkles, title: L('Recebe um prompt estruturado', 'Get a structured prompt'), text: L('O PromptForge Pro transforma a ideia num prompt claro, pronto a usar no ChatGPT, Gemini ou Claude.', 'PromptForge Pro turns the idea into a clear prompt, ready to use in ChatGPT, Gemini or Claude.') },
    { icon: Gauge, title: L('Otimiza e guarda', 'Optimise and save'), text: L('Vê a pontuação, melhora com sugestões explicadas e guarda os melhores na tua biblioteca.', 'See the score, improve it with explained suggestions and keep the best ones in your library.') },
  ];

  const plans: { name: string; price: string; detail: string; note?: string; items: string[]; highlight?: boolean }[] = [
    { name: 'Free', price: '0€', detail: L('para sempre', 'forever'), items: [L('3 otimizações por prompt, até 20 por dia', '3 optimisations per prompt, up to 20 per day'), L('Biblioteca de prompts', 'Prompt library'), L('Criador guiado básico', 'Basic guided builder')] },
    { name: 'Prompt Packs', price: '19€', detail: L('pagamento único', 'one-time payment'), items: [L('Todos os Prompt Packs premium', 'All premium Prompt Packs'), L('Todas as lições do Aprender', 'All Learn lessons'), L('Atualizações futuras incluídas', 'Future updates included')] },
    { name: 'Pro', price: '9€', detail: L('/mês, sem fidelização', '/month, no commitment'), note: L('ou 90€/ano, 2 meses grátis', 'or 90€/year, 2 months free'), items: [L('Tudo dos Prompt Packs incluído', 'Everything in Prompt Packs included'), L('Otimizações ilimitadas', 'Unlimited optimisations'), L('Histórico de versões e testes A/B', 'Version history and A/B tests'), L('Todas as lições do Aprender', 'All Learn lessons')], highlight: true },
  ];

  const faqs = [
    { q: L('Preciso de saber escrever prompts?', 'Do I need to know how to write prompts?'), a: L('Não. Basta descreveres o que queres. O PromptForge Pro faz as perguntas certas e monta o prompt por ti.', 'No. Just describe what you want. PromptForge Pro asks the right questions and builds the prompt for you.') },
    { q: L('Funciona com que ferramentas de IA?', 'Which AI tools does it work with?'), a: L('Os prompts são texto, por isso podes usá-los no ChatGPT, Gemini, Claude, Copilot ou noutra ferramenta à tua escolha.', 'Prompts are plain text, so you can use them in ChatGPT, Gemini, Claude, Copilot or any other tool you like.') },
    { q: L('O plano Free é mesmo grátis?', 'Is the Free plan really free?'), a: L('Sim. Não pedimos cartão para criar conta. Só pagas se escolheres o Pro ou os Prompt Packs.', 'Yes. No card is needed to sign up. You only pay if you choose Pro or the Prompt Packs.') },
    { q: L('Posso cancelar o Pro?', 'Can I cancel Pro?'), a: L('Sim, quando quiseres, na página da tua conta. Manténs o acesso até ao fim do período pago.', 'Yes, at any time from your account page. You keep access until the end of the paid period.') },
    { q: L('Está em português de Portugal?', 'Is it available in English?'), a: L('Sim. A aplicação e os prompts gerados estão em português de Portugal, e também podes mudar para inglês.', 'Yes. The app works in English and European Portuguese, and you can switch at any time.') },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <VisitorCampaign />
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          <Link to="/" className="flex items-center gap-2" aria-label="PromptForge Pro">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary [html[data-fs]_&]:max-sm:hidden"><Flame className="h-4 w-4 text-primary-foreground" aria-hidden="true" /></span>
            <Wordmark className="text-base sm:text-lg [html[data-fs=xlarge]_&]:max-sm:text-sm" />
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-2" aria-label={L('Navegação principal', 'Main navigation')}>
            <Link to="/pricing" className="hidden px-2 text-sm text-muted-foreground hover:text-foreground sm:inline">{L('Preços', 'Pricing')}</Link>
            <Link to="/learn" className="hidden px-2 text-sm text-muted-foreground hover:text-foreground sm:inline">{L('Aprender', 'Learn')}</Link>
            <FontSizeControl />
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild className="px-2 sm:px-3"><Link to="/login">{L('Entrar', 'Sign in')}</Link></Button>
            <Button size="sm" asChild className="hidden sm:inline-flex"><Link to="/signup">{L('Começar grátis', 'Start free')}</Link></Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Light theme: soft brand-orange glow behind the hero (dark theme unchanged). */}
        <div className="bg-gradient-to-b from-primary/10 via-primary/[0.03] to-transparent dark:from-transparent dark:via-transparent">
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 text-center md:pt-20">
          <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
            {L('Prompts profissionais para IA, sem complicações', 'Professional AI prompts, without the hassle')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            {L('Cria, otimiza e guarda prompts que dão resultados melhores no ChatGPT, Gemini e Claude. Pensado para quem trabalha em português de Portugal.',
               'Create, optimise and save prompts that get better results in ChatGPT, Gemini and Claude. Built for people who work in European Portuguese and English.')}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild><Link to="/signup">{L('Começar grátis', 'Start free')} <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link></Button>
            <Button size="lg" variant="outline" asChild><Link to="/pricing">{L('Ver planos', 'See plans')}</Link></Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{L('Sem cartão de crédito.', 'No credit card needed.')}</p>
        </section>
        </div>

        <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="exemplo">
          <h2 id="exemplo" className="mb-6 text-center text-2xl font-semibold">{L('Da ideia ao resultado', 'From idea to result')}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-destructive">{L('1. Ideia inicial', '1. Initial idea')}</p>
              <p className="font-mono text-sm">{en ? BEFORE.en : BEFORE.pt}</p>
            </div>
            <div className="rounded-xl border border-success/20 bg-success/5 p-5 text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-success">{L('2. Prompt estruturado', '2. Structured prompt')}</p>
              <p className="whitespace-pre-line font-mono text-sm">{en ? AFTER.en : AFTER.pt}</p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{L('3. Resultado final — exemplo ilustrativo', '3. Final result — illustrative example')}</p>
              <p className="text-sm">{L('Sexta-feira é dia de uma pausa à mesa. O nosso restaurante familiar espera por si para o almoço. Qual é o seu prato favorito para terminar a semana? #Lisboa #AlmoçoEmLisboa #RestauranteLisboa', 'Friday is a good day to take a break at the table. Our family restaurant welcomes you for lunch. What is your favourite dish to end the week? #Lisbon #LunchInLisbon #LisbonRestaurant')}</p>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-muted/30 py-16" aria-labelledby="como-funciona">
          <div className="mx-auto max-w-6xl px-4">
            <h2 id="como-funciona" className="mb-10 text-center text-2xl font-semibold">{L('Como funciona', 'How it works')}</h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="rounded-xl border border-border bg-card p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><s.icon className="h-5 w-5" aria-hidden="true" /></span>
                    <span className="text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                  </div>
                  <h3 className="mb-1 font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
              <p className="flex items-start gap-2"><Library className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{L('Biblioteca com os teus prompts, organizados por categoria.', 'A library with your prompts, organised by category.')}</p>
              <p className="flex items-start gap-2"><Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{L('Prompt Packs por setor: marketing, PME, freelancers, imobiliário e alojamento.', 'Prompt Packs by industry: marketing, small business, freelancers, real estate and hospitality.')}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="planos">
          <h2 id="planos" className="mb-10 text-center text-2xl font-semibold">{L('Planos', 'Plans')}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.name} data-testid={`landing-plan-${p.name.toLowerCase().replace(/\s+/g, '-')}`} className={`flex flex-col rounded-xl border p-6 ${p.highlight ? 'bg-card border-primary shadow-sm' : 'bg-card border-border'}`}>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-2"><span className="text-3xl font-bold">{p.price}</span> <span className="text-sm text-muted-foreground">{p.detail}</span></p>
                {p.note && <p className="mt-1 text-xs font-medium text-orange-700 dark:text-primary">{p.note}</p>}
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {p.items.map((it) => <li key={it} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button variant="outline" asChild><Link to="/pricing">{L('Comparar planos em detalhe', 'Compare plans in detail')}</Link></Button>
          </div>
        </section>

        <UsageLimits />
      <section className="border-t border-border bg-muted/30 py-16" aria-labelledby="faq">
          <div className="mx-auto max-w-3xl px-4">
            <h2 id="faq" className="mb-8 text-center text-2xl font-semibold">{L('Perguntas frequentes', 'Frequently asked questions')}</h2>
            <div className="space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-lg border border-border bg-card p-4">
                  <summary className="cursor-pointer list-none font-medium">{f.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold">{L('Experimenta hoje, é grátis', 'Try it today, it is free')}</h2>
          <Button size="lg" className="mt-6" asChild><Link to="/signup">{L('Começar grátis', 'Start free')}</Link></Button>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} PromptForge Pro</span>
          <Link to="/pricing" className="hover:text-foreground">{L('Preços', 'Pricing')}</Link>
          <Link to="/learn" className="hover:text-foreground">{L('Aprender', 'Learn')}</Link>
          <Link to="/terms" className="hover:text-foreground">{L('Termos e Condições', 'Terms and Conditions')}</Link>
          <Link to="/refunds" className="hover:text-foreground">{L('Reembolsos', 'Refunds')}</Link>
          <Link to="/privacy" className="hover:text-foreground">{L('Privacidade', 'Privacy')}</Link>
        </div>
      </footer>
    </div>
  );
}
