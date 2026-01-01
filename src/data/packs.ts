import { Pack } from '@/types/packs';

export const PACKS: Pack[] = [
  {
    id: 'tiktok-viral',
    slug: 'tiktok',
    name: 'TikTok Viral Prompt Pack',
    promise: 'Cria vídeos pensados para parar o scroll e maximizar retenção nos primeiros segundos.',
    description: 'Hooks, scripts e CTAs desenhados para o comportamento real do TikTok.',
    audience: 'Criadores de conteúdo e marcas no TikTok',
    outcomeCategory: 'content',
    icon: 'Play',
    gradient: 'from-pink-500 to-rose-500',
    isPremium: true,
    previewLimit: 2,
    totalPrompts: 12,
    benefits: [
      'Hooks que captam atenção nos primeiros 3 segundos',
      'Estruturas de vídeo com retenção comprovada',
      'CTAs que convertem visualizações em seguidores',
      'Scripts adaptáveis a qualquer nicho',
    ],
    categories: [
      { id: 'hooks', label: 'Hooks', description: 'Captura atenção instantânea', icon: 'Zap' },
      { id: 'structure', label: 'Estrutura', description: 'Mantém espectadores até ao fim', icon: 'Layout' },
      { id: 'scripts', label: 'Scripts', description: 'Textos prontos a usar', icon: 'FileText' },
      { id: 'cta', label: 'CTA & Retenção', description: 'Converte views em ações', icon: 'MousePointer' },
    ],
    prompts: {
      hooks: [
        {
          id: 'hook-controversy',
          title: 'Hook de Controvérsia',
          description: 'Gera debate e comentários',
          content: 'Cria um hook de 3 segundos para TikTok sobre {{tema}} que desafie uma crença comum do nicho. O hook deve ser provocador mas factualmente correto, gerando vontade de ver até ao fim para entender o argumento.',
          variables: ['tema'],
          isFreePreview: true,
        },
        {
          id: 'hook-curiosity',
          title: 'Hook de Curiosidade',
          description: 'Cria mistério irresistível',
          content: 'Cria um hook de abertura para TikTok sobre {{tema}} que use o "gap de curiosidade" - revela um resultado surpreendente sem explicar como, forçando o espectador a continuar para descobrir.',
          variables: ['tema'],
          isFreePreview: true,
        },
        {
          id: 'hook-personal',
          title: 'Hook Pessoal',
          description: 'Cria conexão emocional',
          content: 'Cria um hook vulnerável e pessoal para TikTok sobre {{tema}} que comece com "Eu costumava..." ou "Ninguém me disse que..." para criar identificação imediata.',
          variables: ['tema'],
        },
        {
          id: 'hook-numbers',
          title: 'Hook com Números',
          description: 'Promete valor específico',
          content: 'Cria um hook para TikTok sobre {{tema}} que use números específicos e surpreendentes. Ex: "Em 47 dias fiz X" ou "3 coisas que 99% não sabem sobre..."',
          variables: ['tema'],
        },
        {
          id: 'hook-prediction',
          title: 'Hook Preditivo',
          description: 'Antecipa o que vai acontecer',
          content: 'Cria um hook para TikTok sobre {{tema}} que faça uma previsão ousada ou aviso. Ex: "Isto vai mudar tudo em {{área}} nos próximos meses..."',
          variables: ['tema', 'área'],
        },
      ],
      structure: [
        {
          id: 'structure-problem',
          title: 'Problema-Agitar-Resolver',
          description: 'Estrutura clássica de conversão',
          content: 'Cria uma estrutura de vídeo TikTok sobre {{tema}} usando: 1) Hook que identifica o problema (3s), 2) Agita a dor mostrando consequências (7s), 3) Apresenta a solução passo-a-passo (15s), 4) CTA direto (5s).',
          variables: ['tema'],
          isFreePreview: true,
        },
        {
          id: 'structure-story',
          title: 'Mini-História',
          description: 'Storytelling em 60 segundos',
          content: 'Cria uma estrutura narrativa para TikTok sobre {{tema}}: Situação inicial → Conflito/Desafio → Ponto de viragem → Resolução → Lição aplicável. Cada parte deve ter transições visuais sugeridas.',
          variables: ['tema'],
        },
        {
          id: 'structure-list',
          title: 'Lista Progressiva',
          description: 'Cada ponto mais valioso',
          content: 'Cria uma estrutura de lista para TikTok sobre {{tema}} onde cada item é progressivamente mais valioso/surpreendente. O último ponto deve ser o "game changer" que justifica ver até ao fim.',
          variables: ['tema'],
        },
      ],
      scripts: [
        {
          id: 'script-tutorial',
          title: 'Tutorial Rápido',
          description: 'Ensina algo útil em 60s',
          content: 'Escreve um script completo de TikTok (60s) que ensine {{habilidade}} a {{audiência}}. Inclui: hook de resultado, 3-4 passos numerados, dica bónus no final, e CTA para guardar.',
          variables: ['habilidade', 'audiência'],
          isFreePreview: true,
        },
        {
          id: 'script-myth',
          title: 'Destrói Mitos',
          description: 'Corrige crenças erradas',
          content: 'Escreve um script de TikTok que desminta {{mito}} sobre {{tema}}. Começa com o mito como gancho, apresenta 2-3 factos contrários, e termina com o que realmente funciona.',
          variables: ['mito', 'tema'],
        },
        {
          id: 'script-comparison',
          title: 'Antes vs Depois',
          description: 'Mostra transformação',
          content: 'Escreve um script de TikTok sobre {{tema}} que compare claramente o "antes" (problema) com o "depois" (solução). Usa contrastes visuais e verbais para maximizar impacto.',
          variables: ['tema'],
        },
      ],
      cta: [
        {
          id: 'cta-follow',
          title: 'CTA para Seguir',
          description: 'Converte views em followers',
          content: 'Cria 5 variações de CTA para TikTok que incentivem a seguir a conta, focando em {{benefício_futuro}}. Evita "segue para mais" genérico - cada CTA deve prometer valor específico.',
          variables: ['benefício_futuro'],
          isFreePreview: true,
        },
        {
          id: 'cta-save',
          title: 'CTA para Guardar',
          description: 'Maximiza o algoritmo',
          content: 'Cria 5 CTAs que incentivem guardar o vídeo sobre {{tema}}. Foca na utilidade futura e no medo de perder a informação. O "guardar" é um sinal forte para o algoritmo.',
          variables: ['tema'],
        },
      ],
    },
  },
  {
    id: 'instagram-reels',
    slug: 'instagram',
    name: 'Instagram Reels Prompt Pack',
    promise: 'Prompts e estruturas para aumentar alcance, saves e interações em Reels.',
    description: 'Conteúdo otimizado para descoberta, consistência e crescimento orgânico.',
    audience: 'Negócios e influenciadores no Instagram',
    outcomeCategory: 'content',
    icon: 'Instagram',
    gradient: 'from-purple-500 to-pink-500',
    isPremium: true,
    previewLimit: 2,
    totalPrompts: 10,
    benefits: [
      'Estruturas completas prontas a usar',
      'Variações otimizadas para diferentes objetivos',
      'CTAs e exemplos aplicáveis imediatamente',
    ],
    categories: [
      { id: 'reels', label: 'Reels', description: 'Vídeos de alto impacto', icon: 'Film' },
      { id: 'captions', label: 'Captions', description: 'Textos que convertem', icon: 'Type' },
    ],
    prompts: {
      reels: [
        {
          id: 'reel-educational',
          title: 'Reel Educativo',
          description: 'Ensina e posiciona como expert',
          content: 'Cria um script de Reel educativo sobre {{tema}} para {{nicho}}. Estrutura: gancho visual (2s), problema comum (5s), solução em 3 passos (20s), resultado esperado (3s), CTA (5s).',
          variables: ['tema', 'nicho'],
          isFreePreview: true,
        },
        {
          id: 'reel-behind',
          title: 'Bastidores',
          description: 'Humaniza a marca',
          content: 'Cria um script de Reel de bastidores para {{negócio}} que mostre o processo por trás de {{produto/serviço}}. Foca em momentos autênticos que criem conexão.',
          variables: ['negócio', 'produto/serviço'],
          isFreePreview: true,
        },
      ],
      captions: [
        {
          id: 'caption-story',
          title: 'Caption Storytelling',
          description: 'Conta histórias que vendem',
          content: 'Escreve uma caption de Instagram para {{tema}} usando storytelling. Estrutura: gancho emocional, história pessoal/cliente, lição, CTA suave. Máximo 2200 caracteres.',
          variables: ['tema'],
        },
        {
          id: 'caption-value',
          title: 'Caption de Valor',
          description: 'Educa e gera guardados',
          content: 'Escreve uma caption educativa sobre {{tema}} formatada com emojis e espaçamento. Inclui: pergunta inicial, 5-7 dicas numeradas, conclusão motivacional, CTA para guardar.',
          variables: ['tema'],
        },
      ],
    },
  },
  {
    id: 'copywriting-sales',
    slug: 'copywriting',
    name: 'Copywriting de Vendas Prompt Pack',
    promise: 'Prompts e frameworks para transformar interesse em decisões de compra.',
    description: 'Copy orientada a conversão para páginas, emails e ofertas.',
    audience: 'Empreendedores e marketers',
    outcomeCategory: 'sales',
    icon: 'PenTool',
    gradient: 'from-emerald-500 to-teal-500',
    isPremium: true,
    previewLimit: 2,
    totalPrompts: 15,
    benefits: [
      'Estruturas completas prontas a usar',
      'Variações otimizadas para diferentes objetivos',
      'CTAs e exemplos aplicáveis imediatamente',
    ],
    categories: [
      { id: 'headlines', label: 'Headlines', description: 'Títulos irresistíveis', icon: 'Type' },
      { id: 'sales-pages', label: 'Páginas de Vendas', description: 'Copy completo', icon: 'FileText' },
      { id: 'emails', label: 'Emails', description: 'Sequências que vendem', icon: 'Mail' },
    ],
    prompts: {
      headlines: [
        {
          id: 'headline-benefit',
          title: 'Headline de Benefício',
          description: 'Foca no resultado',
          content: 'Cria 10 headlines para {{produto}} focando no benefício principal para {{audiência}}. Usa a fórmula: [Resultado desejado] + [Timeframe] + [Sem dor comum].',
          variables: ['produto', 'audiência'],
          isFreePreview: true,
        },
        {
          id: 'headline-curiosity',
          title: 'Headline de Curiosidade',
          description: 'Cria interesse irresistível',
          content: 'Cria 10 headlines para {{produto}} que usem loops de curiosidade. O leitor deve sentir que precisa de saber mais para resolver um problema que não sabia ter.',
          variables: ['produto'],
          isFreePreview: true,
        },
      ],
      'sales-pages': [
        {
          id: 'sales-pas',
          title: 'Página PAS',
          description: 'Problema-Agitação-Solução',
          content: 'Escreve o copy de uma página de vendas para {{produto}} usando a framework PAS. Inclui: headline, subheadline, problema identificado, agitação emocional, solução apresentada, benefícios, prova social, garantia, CTA.',
          variables: ['produto'],
        },
        {
          id: 'sales-aida',
          title: 'Página AIDA',
          description: 'Atenção-Interesse-Desejo-Ação',
          content: 'Escreve o copy de uma página de vendas para {{produto}} usando AIDA. Atenção com headline forte, Interesse com história/problema, Desejo com benefícios e prova, Ação com oferta irrecusável.',
          variables: ['produto'],
        },
      ],
      emails: [
        {
          id: 'email-welcome',
          title: 'Sequência de Boas-vindas',
          description: '5 emails que convertem',
          content: 'Cria uma sequência de 5 emails de boas-vindas para {{produto/serviço}}. Email 1: Entrega + expectativas. Email 2: História + conexão. Email 3: Valor + quick win. Email 4: Prova social. Email 5: Oferta.',
          variables: ['produto/serviço'],
        },
      ],
    },
  },
  {
    id: 'youtube-growth',
    slug: 'youtube',
    name: 'YouTube Growth Prompt Pack',
    promise: 'Estruturas para criar vídeos que retêm audiência e fazem o canal crescer.',
    description: 'Títulos, intros e fluxos pensados para o algoritmo e watch time.',
    audience: 'YouTubers e educadores',
    outcomeCategory: 'content',
    icon: 'Youtube',
    gradient: 'from-red-500 to-orange-500',
    isPremium: true,
    previewLimit: 2,
    totalPrompts: 12,
    benefits: [
      'Estruturas completas prontas a usar',
      'Variações otimizadas para diferentes objetivos',
      'CTAs e exemplos aplicáveis imediatamente',
    ],
    categories: [
      { id: 'titles', label: 'Títulos', description: 'CTR maximizado', icon: 'Type' },
      { id: 'scripts', label: 'Scripts', description: 'Retenção elevada', icon: 'FileText' },
      { id: 'seo', label: 'SEO', description: 'Descoberta orgânica', icon: 'Search' },
    ],
    prompts: {
      titles: [
        {
          id: 'title-curiosity',
          title: 'Título de Curiosidade',
          description: 'Impossível não clicar',
          content: 'Cria 15 títulos para um vídeo sobre {{tema}} que usem curiosity gaps. Máximo 60 caracteres. Inclui variações com números, perguntas, e promessas específicas.',
          variables: ['tema'],
          isFreePreview: true,
        },
        {
          id: 'title-seo',
          title: 'Título SEO-Friendly',
          description: 'Ranking + CTR',
          content: 'Cria 10 títulos para {{tema}} que equilibrem SEO (palavra-chave principal no início) com CTR alto. Inclui variações para diferentes intenções de busca.',
          variables: ['tema'],
          isFreePreview: true,
        },
      ],
      scripts: [
        {
          id: 'script-educational',
          title: 'Script Educativo',
          description: '10-15 min de valor',
          content: 'Escreve um script de vídeo YouTube de 10-12 minutos sobre {{tema}}. Estrutura: Hook (30s), Promessa (30s), Conteúdo em 3-5 secções, Resumo, CTA. Inclui pontos para B-roll.',
          variables: ['tema'],
        },
      ],
      seo: [
        {
          id: 'description-seo',
          title: 'Descrição Otimizada',
          description: 'Ranking + Conversão',
          content: 'Escreve uma descrição de vídeo YouTube sobre {{tema}} com: resumo cativante nos primeiros 150 chars, 3-5 parágrafos com keywords naturais, timestamps, links de recursos, CTA.',
          variables: ['tema'],
        },
      ],
    },
  },
];

export const getPackBySlug = (slug: string): Pack | undefined => {
  return PACKS.find(pack => pack.slug === slug);
};

export const getPacksByCategory = (category: string): Pack[] => {
  return PACKS.filter(pack => pack.outcomeCategory === category);
};

export const getFreePreviewPrompts = (pack: Pack): number => {
  let count = 0;
  Object.values(pack.prompts).forEach(prompts => {
    prompts.forEach(p => {
      if (p.isFreePreview) count++;
    });
  });
  return count;
};
