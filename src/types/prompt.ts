// Core types for PromptForge

export type OutputType = 'text' | 'image' | 'code' | 'video' | 'audio';

export type AIModel = 
  | 'generic'
  | 'gpt-4'
  | 'claude'
  | 'gemini'
  | 'midjourney'
  | 'dalle'
  | 'stable-diffusion'
  | 'sora'
  | 'runway';

export type ToneStyle = 
  | 'professional'
  | 'casual'
  | 'friendly'
  | 'formal'
  | 'creative'
  | 'technical'
  | 'humorous'
  | 'persuasive'
  | 'informative'
  | 'narrative';

export type UserProfile = 
  | 'beginner'
  | 'content-creator'
  | 'developer'
  | 'designer'
  | 'business';

export type Category = 
  | 'marketing'
  | 'writing'
  | 'code'
  | 'image'
  | 'video'
  | 'audio'
  | 'business'
  | 'education'
  | 'creative'
  | 'social-media'
  | 'email'
  | 'other';

export interface PromptVariable {
  name: string;
  defaultValue?: string;
  description?: string;
}

export interface PromptScore {
  overall: number;
  clarity: number;
  specificity: number;
  structure: number;
  outputControl: number;
  creativity: number;
}

export interface PromptFeedback {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  suggestion?: string;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  content: string;
  createdAt: Date;
  label?: string;
  score?: PromptScore;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  description?: string;
  category: Category;
  tags: string[];
  outputType: OutputType;
  targetModel?: AIModel;
  tone?: ToneStyle;
  variables: PromptVariable[];
  score?: PromptScore;
  feedback?: PromptFeedback[];
  versions: PromptVersion[];
  currentVersionId?: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuidedBuilderState {
  step: number;
  objective: string;
  outputType: OutputType | null;
  targetModel: AIModel;
  tone: ToneStyle | null;
  targetAudience: string;
  constraints: string[];
  format: string;
  language: string;
  creativityLevel: number; // 0-100
  additionalContext: string;
}

export interface OptimizationVariant {
  type: 'shorter' | 'detailed' | 'creative' | 'technical' | 'restrictive';
  content: string;
  explanation: string;
  changes: string[];
}

export interface PromptPack {
  id: string;
  name: string;
  description: string;
  category: Category;
  prompts: Prompt[];
  icon: string;
  isPremium: boolean;
}

export interface ComparisonResult {
  promptA: string;
  promptB: string;
  responseA?: string;
  responseB?: string;
  winner?: 'A' | 'B' | 'tie';
  notes?: string;
}

// Builder wizard step configuration
export interface BuilderStep {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const BUILDER_STEPS: BuilderStep[] = [
  { id: 'objective', title: 'Objetivo', description: 'O que queres alcançar?', icon: 'Target' },
  { id: 'output', title: 'Tipo de Output', description: 'Que tipo de conteúdo?', icon: 'Layers' },
  { id: 'model', title: 'Modelo de IA', description: 'Para que IA é este prompt?', icon: 'Cpu' },
  { id: 'tone', title: 'Tom & Estilo', description: 'Como deve soar?', icon: 'Palette' },
  { id: 'audience', title: 'Público-Alvo', description: 'Para quem é?', icon: 'Users' },
  { id: 'constraints', title: 'Restrições', description: 'Limites e formatos', icon: 'Lock' },
  { id: 'creativity', title: 'Criatividade', description: 'Nível de liberdade', icon: 'Sparkles' },
  { id: 'review', title: 'Revisão', description: 'Confirma e gera', icon: 'CheckCircle' },
];

export const OUTPUT_TYPES: { value: OutputType; label: string; icon: string; description: string }[] = [
  { value: 'text', label: 'Texto', icon: 'FileText', description: 'Artigos, emails, posts, copy' },
  { value: 'image', label: 'Imagem', icon: 'Image', description: 'Fotos, ilustrações, arte' },
  { value: 'code', label: 'Código', icon: 'Code', description: 'Programação, scripts, queries' },
  { value: 'video', label: 'Vídeo', icon: 'Video', description: 'Vídeos, animações, clips' },
  { value: 'audio', label: 'Áudio', icon: 'Music', description: 'Música, podcasts, voiceover' },
];

export const TONE_STYLES: { value: ToneStyle; label: string; description: string }[] = [
  { value: 'professional', label: 'Profissional', description: 'Formal e business-like' },
  { value: 'casual', label: 'Casual', description: 'Relaxado e conversacional' },
  { value: 'friendly', label: 'Amigável', description: 'Caloroso e acessível' },
  { value: 'formal', label: 'Formal', description: 'Sério e institucional' },
  { value: 'creative', label: 'Criativo', description: 'Expressivo e artístico' },
  { value: 'technical', label: 'Técnico', description: 'Preciso e especializado' },
  { value: 'humorous', label: 'Humorístico', description: 'Divertido e leve' },
  { value: 'persuasive', label: 'Persuasivo', description: 'Convincente e impactante' },
  { value: 'informative', label: 'Informativo', description: 'Educativo e claro' },
  { value: 'narrative', label: 'Narrativo', description: 'Storytelling' },
];

export const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'marketing', label: 'Marketing', icon: 'Megaphone' },
  { value: 'writing', label: 'Escrita', icon: 'PenTool' },
  { value: 'code', label: 'Código', icon: 'Code' },
  { value: 'image', label: 'Imagem', icon: 'Image' },
  { value: 'video', label: 'Vídeo', icon: 'Video' },
  { value: 'audio', label: 'Áudio', icon: 'Music' },
  { value: 'business', label: 'Negócio', icon: 'Briefcase' },
  { value: 'education', label: 'Educação', icon: 'GraduationCap' },
  { value: 'creative', label: 'Criativo', icon: 'Sparkles' },
  { value: 'social-media', label: 'Redes Sociais', icon: 'Share2' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'other', label: 'Outro', icon: 'MoreHorizontal' },
];

export const AI_MODELS: { value: AIModel; label: string; type: OutputType[] }[] = [
  { value: 'generic', label: 'Genérico (qualquer IA)', type: ['text', 'image', 'code', 'video', 'audio'] },
  { value: 'gpt-4', label: 'GPT-4 / ChatGPT', type: ['text', 'code'] },
  { value: 'claude', label: 'Claude', type: ['text', 'code'] },
  { value: 'gemini', label: 'Google Gemini', type: ['text', 'code', 'image'] },
  { value: 'midjourney', label: 'Midjourney', type: ['image'] },
  { value: 'dalle', label: 'DALL-E', type: ['image'] },
  { value: 'stable-diffusion', label: 'Stable Diffusion', type: ['image'] },
  { value: 'sora', label: 'Sora', type: ['video'] },
  { value: 'runway', label: 'Runway', type: ['video'] },
];
