import { Pack } from '@/types/packs';

export const PACKS: Pack[] = [
  {
    id: 'tiktok-viral',
    slug: 'tiktok',
    name: 'TikTok Viral Prompt Pack',
    promise: 'Create videos designed to stop the scroll and maximize retention in the first seconds.',
    description: 'Hooks, scripts, and CTAs designed for real TikTok behavior.',
    audience: 'Content creators and brands on TikTok',
    outcomeCategory: 'content',
    icon: 'Play',
    gradient: 'from-pink-500 to-rose-500',
    isPremium: true,
    previewLimit: 2,
    totalPrompts: 12,
    benefits: [
      'Hooks that grab attention in the first 3 seconds',
      'Video structures with proven retention',
      'CTAs that turn views into followers',
      'Scripts adaptable to any niche',
    ],
    categories: [
      { id: 'hooks', label: 'Hooks', description: 'Capture attention instantly', icon: 'Zap' },
      { id: 'structure', label: 'Structure', description: 'Keep viewers watching until the end', icon: 'Layout' },
      { id: 'scripts', label: 'Scripts', description: 'Ready-to-use scripts', icon: 'FileText' },
      { id: 'cta', label: 'CTA & Retention', description: 'Turn views into actions', icon: 'MousePointer' },
    ],
    prompts: {
      hooks: [
        {
          id: 'hook-controversy',
          title: 'Controversial Hook',
          description: 'Generates debate and comments',
          content: 'Create a 3-second TikTok hook about {{tema}} that challenges a common belief in the niche. The hook should be provocative but factually correct, making viewers want to watch to the end to understand the argument.',
          variables: ['tema'],
          isFreePreview: true,
        },
        {
          id: 'hook-curiosity',
          title: 'Curiosity Hook',
          description: 'Creates irresistible mystery',
          content: 'Create an opening TikTok hook about {{tema}} that uses the curiosity gap—reveal a surprising result without explaining how, forcing the viewer to keep watching.',
          variables: ['tema'],
          isFreePreview: true,
        },
        {
          id: 'hook-personal',
          title: 'Personal Hook',
          description: 'Creates emotional connection',
          content: 'Create a vulnerable, personal TikTok hook about {{tema}} that starts with "I used to..." or "Nobody told me..." to create immediate identification.',
          variables: ['tema'],
        },
        {
          id: 'hook-numbers',
          title: 'Numbers Hook',
          description: 'Promises specific value',
          content: 'Create a TikTok hook about {{tema}} that uses specific and surprising numbers. Ex: "In 47 days I did X" or "3 things 99% don\'t know about..."',
          variables: ['tema'],
        },
        {
          id: 'hook-prediction',
          title: 'Predictive Hook',
          description: 'Anticipates what will happen',
          content: 'Create a TikTok hook about {{tema}} that makes a bold prediction or warning. Ex: "This will change everything in {{área}} over the next months..."',
          variables: ['tema', 'área'],
        },
      ],
      structure: [
        {
          id: 'structure-problem',
          title: 'Problem-Agitate-Solve',
          description: 'Classic conversion framework',
          content: 'Create a TikTok video structure about {{tema}} using: 1) Hook identifying the problem (3s), 2) Agitate pain by showing consequences (7s), 3) Present the step-by-step solution (15s), 4) Direct CTA (5s).',
          variables: ['tema'],
          isFreePreview: true,
        },
        {
          id: 'structure-story',
          title: 'Mini Story',
          description: 'Storytelling in 60 seconds',
          content: 'Create a narrative TikTok structure about {{tema}}: Initial situation → Conflict/Challenge → Turning point → Resolution → Actionable lesson. Each part should include suggested visual transitions.',
          variables: ['tema'],
        },
        {
          id: 'structure-list',
          title: 'Progressive List',
          description: 'Each point gets more valuable',
          content: 'Create a list structure for TikTok about {{tema}} where each item is progressively more valuable/surprising. The last point should be the game changer that justifies watching to the end.',
          variables: ['tema'],
        },
      ],
      scripts: [
        {
          id: 'script-tutorial',
          title: 'Quick Tutorial',
          description: 'Teach something useful in 60s',
          content: 'Write a complete 60s TikTok script that teaches {{habilidade}} to {{audiência}}. Include: result-driven hook, 3-4 numbered steps, bonus tip at the end, and a save CTA.',
          variables: ['habilidade', 'audiência'],
          isFreePreview: true,
        },
        {
          id: 'script-myth',
          title: 'Myth-Busting',
          description: 'Corrects wrong beliefs',
          content: 'Write a TikTok script debunking {{mito}} about {{tema}}. Start with the myth as a hook, present 2-3 opposing facts, and finish with what actually works.',
          variables: ['mito', 'tema'],
        },
        {
          id: 'script-comparison',
          title: 'Before vs After',
          description: 'Shows transformation',
          content: 'Write a TikTok script about {{tema}} that clearly compares the "before" (problem) with the "after" (solution). Use visual and verbal contrasts to maximize impact.',
          variables: ['tema'],
        },
      ],
      cta: [
        {
          id: 'cta-follow',
          title: 'Follow CTA',
          description: 'Converts views into followers',
          content: 'Create 5 TikTok CTA variations that encourage people to follow the account, focused on {{benefício_futuro}}. Avoid generic "follow for more"—each CTA must promise specific value.',
          variables: ['benefício_futuro'],
          isFreePreview: true,
        },
        {
          id: 'cta-save',
          title: 'Save CTA',
          description: 'Boosts the algorithm',
          content: 'Create 5 CTAs that encourage saving the video about {{tema}}. Focus on future usefulness and fear of missing information. Saves are a strong algorithm signal.',
          variables: ['tema'],
        },
      ],
    },
  },
  {
    id: 'instagram-reels',
    slug: 'instagram',
    name: 'Instagram Reels Prompt Pack',
    promise: 'Prompts and structures to increase reach, saves, and interactions on Reels.',
    description: 'Content optimized for discovery, consistency, and organic growth.',
    audience: 'Businesses and influencers on Instagram',
    outcomeCategory: 'content',
    icon: 'Instagram',
    gradient: 'from-purple-500 to-pink-500',
    isPremium: true,
    previewLimit: 2,
    totalPrompts: 10,
    benefits: [
      'Complete ready-to-use frameworks',
      'Optimized variations for different goals',
      'CTAs and examples you can apply immediately',
    ],
    categories: [
      { id: 'reels', label: 'Reels', description: 'High-impact videos', icon: 'Film' },
      { id: 'captions', label: 'Captions', description: 'Copy that converts', icon: 'Type' },
    ],
    prompts: {
      reels: [
        {
          id: 'reel-educational',
          title: 'Educational Reel',
          description: 'Teaches and positions you as an expert',
          content: 'Create an educational Reel script about {{tema}} for {{nicho}}. Structure: visual hook (2s), common problem (5s), 3-step solution (20s), expected result (3s), CTA (5s).',
          variables: ['tema', 'nicho'],
          isFreePreview: true,
        },
        {
          id: 'reel-behind',
          title: 'Behind the Scenes',
          description: 'Humanizes the brand',
          content: 'Create a behind-the-scenes Reel script for {{negócio}} showing the process behind {{produto/serviço}}. Focus on authentic moments that build connection.',
          variables: ['negócio', 'produto/serviço'],
          isFreePreview: true,
        },
      ],
      captions: [
        {
          id: 'caption-story',
          title: 'Caption Storytelling',
          description: 'Tells stories that sell',
          content: 'Write an Instagram caption for {{tema}} using storytelling. Structure: emotional hook, personal/client story, lesson, soft CTA. Max 2200 characters.',
          variables: ['tema'],
        },
        {
          id: 'caption-value',
          title: 'Value Caption',
          description: 'Educates and drives saves',
          content: 'Write an educational caption about {{tema}} formatted with emojis and spacing. Include: opening question, 5-7 numbered tips, motivational conclusion, save CTA.',
          variables: ['tema'],
        },
      ],
    },
  },
  {
    id: 'copywriting-sales',
    slug: 'copywriting',
    name: 'Sales Copywriting Prompt Pack',
    promise: 'Prompts and frameworks to turn interest into buying decisions.',
    description: 'Conversion-focused copy for pages, emails, and offers.',
    audience: 'Entrepreneurs and marketers',
    outcomeCategory: 'sales',
    icon: 'PenTool',
    gradient: 'from-emerald-500 to-teal-500',
    isPremium: true,
    previewLimit: 2,
    totalPrompts: 15,
    benefits: [
      'Complete ready-to-use frameworks',
      'Optimized variations for different goals',
      'CTAs and examples you can apply immediately',
    ],
    categories: [
      { id: 'headlines', label: 'Headlines', description: 'Irresistible headlines', icon: 'Type' },
      { id: 'sales-pages', label: 'Sales Pages', description: 'Complete copy', icon: 'FileText' },
      { id: 'emails', label: 'Emails', description: 'Sequences that sell', icon: 'Mail' },
    ],
    prompts: {
      headlines: [
        {
          id: 'headline-benefit',
          title: 'Benefit Headline',
          description: 'Focuses on the result',
          content: 'Create 10 headlines for {{produto}} focused on the main benefit for {{audiência}}. Use the formula: [Desired result] + [Timeframe] + [Without common pain].',
          variables: ['produto', 'audiência'],
          isFreePreview: true,
        },
        {
          id: 'headline-curiosity',
          title: 'Curiosity Headline',
          description: 'Creates irresistible interest',
          content: 'Create 10 headlines for {{produto}} using curiosity loops. The reader should feel they need to know more to solve a problem they didn\'t know they had.',
          variables: ['produto'],
          isFreePreview: true,
        },
      ],
      'sales-pages': [
        {
          id: 'sales-pas',
          title: 'PAS Page',
          description: 'Problem-Agitation-Solution',
          content: 'Write sales page copy for {{produto}} using the PAS framework. Include: headline, subheadline, identified problem, emotional agitation, presented solution, benefits, social proof, guarantee, CTA.',
          variables: ['produto'],
        },
        {
          id: 'sales-aida',
          title: 'AIDA Page',
          description: 'Attention-Interest-Desire-Action',
          content: 'Write sales page copy for {{produto}} using AIDA. Attention with a strong headline, Interest with story/problem, Desire with benefits and proof, Action with an irresistible offer.',
          variables: ['produto'],
        },
      ],
      emails: [
        {
          id: 'email-welcome',
          title: 'Welcome Sequence',
          description: '5 emails that convert',
          content: 'Create a 5-email welcome sequence for {{produto/serviço}}. Email 1: Delivery + expectations. Email 2: Story + connection. Email 3: Value + quick win. Email 4: Social proof. Email 5: Offer.',
          variables: ['produto/serviço'],
        },
      ],
    },
  },
  {
    id: 'youtube-growth',
    slug: 'youtube',
    name: 'YouTube Growth Prompt Pack',
    promise: 'Frameworks to create videos that retain viewers and grow your channel.',
    description: 'Titles, intros, and flows designed for algorithm performance and watch time.',
    audience: 'YouTubers and educators',
    outcomeCategory: 'content',
    icon: 'Youtube',
    gradient: 'from-red-500 to-orange-500',
    isPremium: true,
    previewLimit: 2,
    totalPrompts: 12,
    benefits: [
      'Complete ready-to-use frameworks',
      'Optimized variations for different goals',
      'CTAs and examples you can apply immediately',
    ],
    categories: [
      { id: 'titles', label: 'Titles', description: 'Maximized CTR', icon: 'Type' },
      { id: 'scripts', label: 'Scripts', description: 'High retention', icon: 'FileText' },
      { id: 'seo', label: 'SEO', description: 'Organic discovery', icon: 'Search' },
    ],
    prompts: {
      titles: [
        {
          id: 'title-curiosity',
          title: 'Curiosity Title',
          description: 'Impossible not to click',
          content: 'Create 15 titles for a video about {{tema}} using curiosity gaps. Max 60 characters. Include variations with numbers, questions, and specific promises.',
          variables: ['tema'],
          isFreePreview: true,
        },
        {
          id: 'title-seo',
          title: 'SEO-Friendly Title',
          description: 'Ranking + CTR',
          content: 'Create 10 titles for {{tema}} balancing SEO (main keyword first) with high CTR. Include variations for different search intents.',
          variables: ['tema'],
          isFreePreview: true,
        },
      ],
      scripts: [
        {
          id: 'script-educational',
          title: 'Educational Script',
          description: '10-15 minutes of value',
          content: 'Write a 10-12 minute YouTube video script about {{tema}}. Structure: Hook (30s), Promise (30s), Content in 3-5 sections, Summary, CTA. Include B-roll cues.',
          variables: ['tema'],
        },
      ],
      seo: [
        {
          id: 'description-seo',
          title: 'Optimized Description',
          description: 'Ranking + Conversion',
          content: 'Write a YouTube video description about {{tema}} with: engaging summary in the first 150 chars, 3-5 paragraphs with natural keywords, timestamps, resource links, CTA.',
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
