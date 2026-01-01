// Pack types and data structures for PromptForge
// Packs are positioned as outcome-focused solutions

export interface PackPrompt {
  id: string;
  title: string;
  description: string;
  content: string;
  variables: string[];
  isFreePreview?: boolean;
}

export interface PackCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export interface Pack {
  id: string;
  slug: string;
  name: string;
  // Result-focused subtitle
  promise: string;
  // Short explanation of what it solves
  description: string;
  // Who is this for?
  audience: string;
  // Outcome category
  outcomeCategory: 'content' | 'sales' | 'productivity' | 'creativity';
  // Visual
  icon: string;
  gradient: string;
  // Access
  isPremium: boolean;
  // Structure
  categories: PackCategory[];
  prompts: Record<string, PackPrompt[]>;
  // Preview config
  previewLimit: number;
  // Value proposition
  benefits: string[];
  // What users get
  totalPrompts: number;
}

export const OUTCOME_CATEGORIES = {
  content: {
    label: 'Criação de Conteúdo',
    description: 'Cria conteúdo viral e envolvente',
    icon: 'Video',
  },
  sales: {
    label: 'Vendas & Conversão',
    description: 'Textos que convertem visitantes em clientes',
    icon: 'TrendingUp',
  },
  productivity: {
    label: 'Produtividade',
    description: 'Automatiza tarefas e poupa tempo',
    icon: 'Zap',
  },
  creativity: {
    label: 'Criatividade',
    description: 'Gera ideias únicas e inovadoras',
    icon: 'Lightbulb',
  },
} as const;

export type OutcomeCategory = keyof typeof OUTCOME_CATEGORIES;
