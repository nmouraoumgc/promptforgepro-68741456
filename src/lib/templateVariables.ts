// Friendly labels + example placeholders for {{variables}} used in pack templates (pt-PT and EN).
// Pack templates use Portuguese variable names in the pt-PT text and English names in the EN text,
// so each language has its own map. Unknown variables fall back to a humanised name.

type VarLabel = [label: string, example: string];

export const VAR_LABELS_PT: Record<string, VarLabel> = {
  acao: ['Ação pretendida', 'Ex.: marcar uma reunião'],
  area: ['Área (m2)', 'Ex.: 120'],
  area_direito: ['Área do direito', 'Ex.: arrendamento'],
  avaliacao: ['Avaliação do cliente', 'Cola aqui o texto da avaliação'],
  cargo_alvo: ['Cargo-alvo', 'Ex.: diretor de marketing'],
  cliente: ['Cliente', 'Ex.: Clínica Sorriso'],
  cliente_ideal: ['O teu cliente ideal', 'Ex.: restaurantes independentes'],
  colunas: ['Colunas', 'Ex.: A (data), B (valor)'],
  comissao: ['Comissão', 'Ex.: 5%'],
  contexto: ['Contexto', 'Ex.: abrir uma segunda loja'],
  contrato: ['Texto do contrato', 'Cola aqui o contrato'],
  dados: ['Dados', 'Cola aqui os números ou a tabela'],
  data: ['Data', 'Ex.: 15 de novembro'],
  data_comercial: ['Data comercial', 'Ex.: Black Friday'],
  data_fim: ['Data de fim', 'Ex.: 30 de novembro'],
  destinatario: ['Destinatário', 'Ex.: o fornecedor'],
  documento: ['Documento', 'Cola aqui o documento'],
  email: ['Email atual', 'Cola aqui o email'],
  empresa: ['A tua empresa', 'Ex.: Tecnologias Atlântico'],
  evento: ['Evento', 'Ex.: webinar de lançamento'],
  experiencia: ['Experiência', 'Ex.: o meu primeiro grande cliente'],
  ferramenta: ['Ferramenta', 'Ex.: Excel'],
  funcao: ['Função', 'Ex.: gestor de loja'],
  horario: ['Horário', 'Ex.: 9h–18h, seg. a sex.'],
  iman: ['Oferta gratuita', 'Ex.: guia em PDF'],
  incentivo: ['Incentivo', 'Ex.: 10% de desconto'],
  instrucoes: ['Instruções de check-in', 'Ex.: chave no cofre, código 1234'],
  localidade: ['Localidade', 'Ex.: Ericeira'],
  loja: ['A tua loja', 'Ex.: Casa da Cerâmica'],
  marketplace: ['Marketplace', 'Ex.: Worten'],
  mensagem: ['Mensagem do cliente', 'Cola aqui a mensagem'],
  modelo: ['Modelo de honorários', 'Ex.: avença mensal'],
  negocio: ['O teu negócio', 'Ex.: Pastelaria Doce Lisboa'],
  nicho: ['Nicho', 'Ex.: finanças pessoais'],
  nome: ['Nome do alojamento', 'Ex.: Casa do Mar'],
  notas: ['Notas', 'Cola aqui as notas'],
  novidades: ['Novidades', 'Ex.: novo menu de outono'],
  numero: ['Número de pessoas', 'Ex.: 4'],
  numero_fatura: ['Número da fatura', 'Ex.: FT 2026/123'],
  objecao: ['Objeção', 'Ex.: está muito caro'],
  objetivo: ['Objetivo', 'Ex.: ganhar seguidores'],
  oferta: ['Oferta', 'Ex.: curso de fotografia'],
  opcao_a: ['Opção A', 'Ex.: contratar alguém'],
  opcao_b: ['Opção B', 'Ex.: subcontratar'],
  palavra_chave: ['Palavra-chave', 'Ex.: sapatos de couro'],
  palavras_chave: ['Palavras-chave', 'Ex.: contabilidade, PME'],
  pedido: ['Pedido do cliente', 'Ex.: mais uma página no site'],
  perguntas: ['Perguntas dos clientes', 'Cola aqui as perguntas'],
  plataforma: ['Plataforma', 'Ex.: Google'],
  pratos: ['Pratos', 'Ex.: bacalhau à Brás, arroz de pato'],
  preco: ['Preço', 'Ex.: 49 €'],
  preco_base: ['Preço base', 'Ex.: 300 €'],
  problema: ['Problema', 'Ex.: falta de tempo'],
  processo: ['Processo', 'Ex.: preparação das encomendas'],
  produto: ['O teu produto', 'Ex.: creme de rosto natural'],
  profissao: ['A tua profissão', 'Ex.: consultor financeiro'],
  projeto: ['Projeto', 'Ex.: novo site'],
  publicacao: ['Publicação', 'Cola aqui a publicação'],
  publico: ['Público-alvo', 'Ex.: pais recentes'],
  rascunho: ['Rascunho', 'Cola aqui o rascunho'],
  reclamacao: ['Reclamação', 'Cola aqui a reclamação'],
  referencia: ['Referência do processo', 'Ex.: Proc. 123/26'],
  restaurante: ['Restaurante', 'Ex.: Tasca do Zé'],
  resultado: ['Resultado', 'Ex.: poupar 10 horas por semana'],
  resumo: ['Resumo do vídeo', 'Cola aqui o resumo'],
  salario: ['Intervalo salarial', 'Ex.: 1200–1500 €'],
  servico: ['Serviço', 'Ex.: gestão de redes sociais'],
  setor: ['Setor', 'Ex.: restauração'],
  situacao: ['Situação', 'Ex.: atrasos frequentes'],
  solucao: ['Solução', 'Ex.: reembolso total'],
  tarefa: ['Tarefa', 'Ex.: fecho de caixa'],
  tarefas: ['Lista de tarefas', 'Cola aqui as tarefas'],
  tema: ['Tema', 'Ex.: poupar dinheiro'],
  tendencia: ['Tendência', 'Ex.: "Prepara-te comigo"'],
  tipo_cliente: ['Tipo de cliente', 'Ex.: clínicas dentárias'],
  tipo_contrato: ['Tipo de contrato', 'Ex.: prestação de serviços'],
  tipo_documento: ['Tipo de documento', 'Ex.: contestação'],
  tipo_hospede: ['Tipo de hóspede', 'Ex.: famílias'],
  tipologia: ['Tipologia', 'Ex.: T2'],
  titulo: ['Título do vídeo', 'Ex.: Como poupar 500 € por ano'],
  tom: ['Tom', 'Ex.: descontraído'],
  valor: ['Valor', 'Ex.: 1500 €'],
  zona: ['Zona', 'Ex.: Campo de Ourique, Lisboa'],
};

export const VAR_LABELS_EN: Record<string, VarLabel> = {
  action: ['Desired action', 'e.g. book a call'],
  amount: ['Amount', 'e.g. £1,500'],
  area: ['Area', 'e.g. Shoreditch, London'],
  audience: ['Target audience', 'e.g. new parents'],
  base_price: ['Base price', 'e.g. £300'],
  business: ['Your business', 'e.g. Sunrise Bakery'],
  client: ['Client', 'e.g. Bright Smile Clinic'],
  client_type: ['Client type', 'e.g. dental clinics'],
  columns: ['Columns', 'e.g. A (date), B (amount)'],
  commission: ['Commission', 'e.g. 3%'],
  company: ['Your company', 'e.g. Atlantic Tech'],
  complaint: ['Complaint', 'Paste the complaint here'],
  context: ['Context', 'e.g. opening a second shop'],
  contract: ['Contract text', 'Paste the contract here'],
  contract_type: ['Contract type', 'e.g. services agreement'],
  data: ['Data', 'Paste the numbers or table here'],
  date: ['Date', 'e.g. 15 November'],
  dishes: ['Dishes', 'e.g. fish pie, lamb shank'],
  document: ['Document', 'Paste the document here'],
  document_type: ['Document type', 'e.g. witness statement'],
  draft: ['Draft', 'Paste your draft here'],
  email: ['Current email', 'Paste the email here'],
  end_date: ['End date', 'e.g. 30 November'],
  event: ['Event', 'e.g. launch webinar'],
  experience: ['Experience', 'e.g. landing my first big client'],
  goal: ['Goal', 'e.g. gain followers'],
  guest_type: ['Guest type', 'e.g. families'],
  hours: ['Opening hours', 'e.g. 9am–6pm, Mon–Fri'],
  ideal_client: ['Your ideal client', 'e.g. independent restaurants'],
  incentive: ['Incentive', 'e.g. 10% off'],
  industry: ['Industry', 'e.g. hospitality'],
  instructions: ['Check-in instructions', 'e.g. key in lockbox, code 1234'],
  invoice_number: ['Invoice number', 'e.g. INV-2026-123'],
  keyword: ['Keyword', 'e.g. leather shoes'],
  keywords: ['Keywords', 'e.g. bookkeeping, small business'],
  lead_magnet: ['Free offer', 'e.g. PDF guide'],
  location: ['Location', 'e.g. Cornwall'],
  marketplace: ['Marketplace', 'e.g. Amazon'],
  message: ['Customer message', 'Paste the message here'],
  model: ['Fee model', 'e.g. monthly retainer'],
  news: ['News', 'e.g. new autumn menu'],
  niche: ['Niche', 'e.g. personal finance'],
  notes: ['Notes', 'Paste your notes here'],
  number: ['Number of people', 'e.g. 4'],
  objection: ['Objection', 'e.g. it is too expensive'],
  offer: ['Offer', 'e.g. photography course'],
  option_a: ['Option A', 'e.g. hire someone'],
  option_b: ['Option B', 'e.g. outsource'],
  platform: ['Platform', 'e.g. Google'],
  post: ['Post', 'Paste the post here'],
  practice_area: ['Practice area', 'e.g. tenancy'],
  price: ['Price', 'e.g. £49'],
  problem: ['Problem', 'e.g. lack of time'],
  process: ['Process', 'e.g. packing orders'],
  product: ['Your product', 'e.g. natural face cream'],
  profession: ['Your profession', 'e.g. financial adviser'],
  project: ['Project', 'e.g. new website'],
  property_name: ['Property name', 'e.g. Sea View Cottage'],
  property_type: ['Property type', 'e.g. 2-bed flat'],
  questions: ['Customer questions', 'Paste the questions here'],
  recipient: ['Recipient', 'e.g. our supplier'],
  reference: ['Case reference', 'e.g. Case 123/26'],
  request: ['Client request', 'e.g. one more page on the site'],
  restaurant: ['Restaurant', 'e.g. The Old Mill'],
  result: ['Result', 'e.g. save 10 hours a week'],
  review: ['Customer review', 'Paste the review here'],
  role: ['Role', 'e.g. store manager'],
  salary: ['Salary range', 'e.g. £30k–£35k'],
  service: ['Service', 'e.g. social media management'],
  shopping_event: ['Shopping event', 'e.g. Black Friday'],
  situation: ['Situation', 'e.g. frequent delays'],
  size: ['Size (m2)', 'e.g. 80'],
  solution: ['Solution', 'e.g. full refund'],
  store: ['Your store', 'e.g. Clay & Co'],
  summary: ['Video summary', 'Paste the summary here'],
  target_role: ['Target role', 'e.g. marketing director'],
  task: ['Task', 'e.g. end-of-day cash-up'],
  tasks: ['Task list', 'Paste your tasks here'],
  title: ['Video title', 'e.g. How to save £500 a year'],
  tone: ['Tone', 'e.g. relaxed'],
  tool: ['Tool', 'e.g. Excel'],
  topic: ['Topic', 'e.g. saving money'],
  trend: ['Trend', 'e.g. "Get ready with me"'],
};

const humanise = (name: string) => {
  const s = name.replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Label + example placeholder for a variable in the given site language (falls back to the other map, then a humanised name). */
export function varLabel(name: string, isEnglish: boolean): { label: string; example: string } {
  const key = name.trim();
  const hit = (isEnglish ? VAR_LABELS_EN[key] ?? VAR_LABELS_PT[key] : VAR_LABELS_PT[key] ?? VAR_LABELS_EN[key]);
  return hit ? { label: hit[0], example: hit[1] } : { label: humanise(key), example: '' };
}

const VAR_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

/** Distinct variable names in a template, in order of appearance. */
export function extractVars(template: string): string[] {
  const out: string[] = [];
  for (const m of template.matchAll(VAR_RE)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

export type TemplatePart = { text: string; varName?: string; filled?: boolean };

/** Splits a template into text and variable parts; unfilled variables become [LABEL IN CAPS]. */
export function templateParts(template: string, values: Record<string, string>, isEnglish: boolean): TemplatePart[] {
  const parts: TemplatePart[] = [];
  let last = 0;
  for (const m of template.matchAll(VAR_RE)) {
    if (m.index! > last) parts.push({ text: template.slice(last, m.index) });
    const v = (values[m[1]] ?? '').trim();
    parts.push(v
      ? { text: v, varName: m[1], filled: true }
      : { text: `[${varLabel(m[1], isEnglish).label.toLocaleUpperCase(isEnglish ? 'en' : 'pt-PT')}]`, varName: m[1], filled: false });
    last = m.index! + m[0].length;
  }
  if (last < template.length) parts.push({ text: template.slice(last) });
  return parts;
}

export const fillTemplate = (template: string, values: Record<string, string>, isEnglish: boolean) =>
  templateParts(template, values, isEnglish).map((p) => p.text).join('');
