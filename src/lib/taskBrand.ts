// Local hints only: never transmit prompt text to analytics or a classifier.
export interface TaskBrandSummary { name: string; offering: string; tone: string; audience: string; keywords: string[]; forbidden_words: string[]; language: 'pt' | 'en' }
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function brandConflict(brand: TaskBrandSummary | null, request: string): boolean {
  if (!brand || !request.trim()) return false;
  const task=fold(request), context=fold(brand.offering+' '+brand.name);
  if (brand.language==='pt' && /\b(in english|em ingles)\b/.test(task)) return true;
  if (brand.language==='en' && /\b(em portugues|portuguese)\b/.test(task)) return true;
  const sectors=[/\b(imoveis|imobiliari\w*|real estate|off.plan)\b/, /\b(livraria|bookshop|bookstore)\b/, /\b(restaurante|restaurant|cafe|alojamento|hotel)\b/, /\b(cosmetica|cosmetics|perfume)\b/];
  const brandSectors=sectors.filter(re=>re.test(context));
  return brandSectors.length>0 && sectors.some(re=>re.test(task) && !re.test(context)) && !brandSectors.some(re=>re.test(task));
}
export function taskBrandFields(b: TaskBrandSummary) {
  const clean=(s: string,max=800)=>s.replace(/\p{Cc}+/gu,' ').trim().slice(0,max);
  return { name:clean(b.name,80), offering:clean(b.offering), audience:clean(b.audience,500), tone:clean(b.tone,500), language:b.language,
    keywords:b.keywords.map(s=>clean(s,60)).filter(Boolean).join(', '), forbidden:b.forbidden_words.map(s=>clean(s,60)).filter(Boolean).join(', ') };
}
