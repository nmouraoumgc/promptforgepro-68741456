// Per-page <title> and meta description in pt-PT and EN. RouteMeta sets the static ones from the
// current path; dynamic pages (a pack, a lesson) override them with usePageMeta once data loads.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsEnglish } from '@/i18n/lang';

type Meta = { title: string; description: string };
const BRAND = 'PromptForge Pro';

const META: Record<string, { pt: Meta; en: Meta }> = {
  '/': {
    pt: { title: 'Painel', description: 'Cria, otimiza e testa prompts profissionais com IA, em português de Portugal.' },
    en: { title: 'Dashboard', description: 'Create, optimise and test professional AI prompts.' },
  },
  '/quick': {
    pt: { title: 'Prompt Rápido', description: 'Gera um prompt profissional em segundos a partir de uma ideia simples.' },
    en: { title: 'Quick Prompt', description: 'Turn a simple idea into a professional prompt in seconds.' },
  },
  '/builder': {
    pt: { title: 'Criar Prompt', description: 'Constrói um prompt passo a passo: objetivo, público, tom, restrições e formato.' },
    en: { title: 'Create Prompt', description: 'Build a prompt step by step: goal, audience, tone, constraints and format.' },
  },
  '/create': {
    pt: { title: 'Criar', description: 'Cria um prompt em modo rápido ou detalhado, ou otimiza um prompt que já tens.' },
    en: { title: 'Create', description: 'Create a prompt in quick or detailed mode, or optimise one you already have.' },
  },
  '/brand': {
    pt: { title: 'Cofre de marca', description: 'Guarda o tom de voz, o público e as palavras da tua marca para a IA escrever como tu.' },
    en: { title: 'Brand Kit', description: 'Save your brand tone, audience and words so the AI writes like you.' },
  },
  '/library': {
    pt: { title: 'Biblioteca', description: 'Os teus prompts guardados, organizados por categoria e favoritos.' },
    en: { title: 'Library', description: 'Your saved prompts, organised by category and favourites.' },
  },
  '/optimizer': {
    pt: { title: 'Otimizador de Prompts', description: 'Recebe uma pontuação do teu prompt e versões melhoradas, com a explicação de cada alteração.' },
    en: { title: 'Prompt Optimizer', description: 'Score your prompt and get improved versions, with every change explained.' },
  },
  '/versions': {
    pt: { title: 'Histórico de Versões', description: 'Consulta e compara as versões anteriores dos teus prompts.' },
    en: { title: 'Version History', description: 'Review and compare earlier versions of your prompts.' },
  },
  '/tester': {
    pt: { title: 'Teste A/B de Prompts', description: 'Compara dois prompts lado a lado e escolhe o que dá melhores resultados.' },
    en: { title: 'Prompt A/B Testing', description: 'Compare two prompts side by side and keep the one that performs better.' },
  },
  '/learn': {
    pt: { title: 'Aprender', description: 'Lições práticas de 5 minutos para usar IA no teu negócio: marketing, PME, freelancers, imobiliário e alojamento.' },
    en: { title: 'Learn', description: 'Practical 5-minute lessons on using AI in your business: marketing, small business, freelancers, real estate and hospitality.' },
  },
  '/packs': {
    pt: { title: 'Prompt Packs', description: 'Packs de templates prontos a usar por setor, com variáveis para preencher.' },
    en: { title: 'Prompt Packs', description: 'Ready-to-use template packs by industry, with fill-in variables.' },
  },
  '/settings': {
    pt: { title: 'Definições', description: 'Idioma, preferências e definições da tua conta.' },
    en: { title: 'Settings', description: 'Language, preferences and account settings.' },
  },
  '/pricing': {
    pt: { title: 'Preços', description: 'Planos Free, Pro e Premium do PromptForge Pro. Experimenta o Pro por 2 € durante 7 dias.' },
    en: { title: 'Pricing', description: 'PromptForge Pro Free, Pro and Premium plans. Try Pro for 2 euros for 7 days.' },
  },
  '/planos': {
    pt: { title: 'Planos', description: 'Compara os planos e gere a tua subscrição.' },
    en: { title: 'Plans', description: 'Compare plans and manage your subscription.' },
  },
  '/checkout': {
    pt: { title: 'Pagamento', description: 'Conclui a tua compra em segurança.' },
    en: { title: 'Checkout', description: 'Complete your purchase securely.' },
  },
  '/purchase-success': {
    pt: { title: 'Compra concluída', description: 'Obrigado pela tua compra.' },
    en: { title: 'Purchase complete', description: 'Thank you for your purchase.' },
  },
  '/subscription-success': {
    pt: { title: 'Subscrição ativa', description: 'A tua subscrição está ativa.' },
    en: { title: 'Subscription active', description: 'Your subscription is active.' },
  },
  '/account': {
    pt: { title: 'A minha conta', description: 'Dados da conta, plano e faturação.' },
    en: { title: 'My account', description: 'Account details, plan and billing.' },
  },
  '/admin': {
    pt: { title: 'Administração', description: 'Área de administração.' },
    en: { title: 'Admin', description: 'Admin area.' },
  },
  '/login': {
    pt: { title: 'Iniciar sessão', description: 'Entra na tua conta PromptForge Pro.' },
    en: { title: 'Sign in', description: 'Sign in to your PromptForge Pro account.' },
  },
  '/signup': {
    pt: { title: 'Criar conta', description: 'Cria a tua conta grátis e começa a escrever prompts melhores.' },
    en: { title: 'Sign up', description: 'Create your free account and start writing better prompts.' },
  },
  '/terms': {
    pt: { title: 'Termos e Condições', description: 'Termos e condições de utilização do PromptForge Pro.' },
    en: { title: 'Terms and Conditions', description: 'PromptForge Pro terms and conditions of use.' },
  },
  '/refunds': {
    pt: { title: 'Política de Reembolsos', description: 'Como funcionam os reembolsos no PromptForge Pro.' },
    en: { title: 'Refund Policy', description: 'How refunds work at PromptForge Pro.' },
  },
  '/privacy': {
    pt: { title: 'Política de Privacidade', description: 'Como tratamos os teus dados pessoais.' },
    en: { title: 'Privacy Policy', description: 'How we handle your personal data.' },
  },
};

const NOT_FOUND = {
  pt: { title: 'Página não encontrada', description: 'A página que procuras não existe.' },
  en: { title: 'Page not found', description: 'The page you are looking for does not exist.' },
};
const DYNAMIC: Record<string, { pt: Meta; en: Meta }> = { '/learn/': META['/learn'], '/packs/': META['/packs'], '/library/': META['/library'] };

function setMetaTag(selector: string, attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

export function applyMeta(meta: Meta, isEnglish: boolean) {
  const full = meta.title === BRAND ? BRAND : `${meta.title} | ${BRAND}`;
  document.title = full;
  document.documentElement.lang = isEnglish ? 'en' : 'pt-PT';
  setMetaTag('meta[name="description"]', 'name', 'description', meta.description);
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', full);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', meta.description);
}

export function metaForPath(path: string, isEnglish: boolean): Meta {
  const p = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const hit = META[p] ?? Object.entries(DYNAMIC).find(([k]) => p.startsWith(k))?.[1] ?? NOT_FOUND;
  return isEnglish ? hit.en : hit.pt;
}

/** Mounted once inside the router: static title/description per route and language. */
export function RouteMeta() {
  const { pathname } = useLocation();
  const isEnglish = useIsEnglish();
  useEffect(() => { applyMeta(metaForPath(pathname, isEnglish), isEnglish); }, [pathname, isEnglish]);
  return null;
}

/** Dynamic override for pages whose title comes from data (runs after RouteMeta). */
export function usePageMeta(meta: Meta | null, isEnglish: boolean) {
  const title = meta?.title; const description = meta?.description;
  useEffect(() => {
    if (title) applyMeta({ title, description: description || '' }, isEnglish);
  }, [title, description, isEnglish]);
}
