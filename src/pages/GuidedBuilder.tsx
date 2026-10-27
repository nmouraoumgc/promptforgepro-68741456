import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check,
  Target,
  Layers,
  Cpu,
  Palette,
  Users,
  Lock,
  Sparkles,
  CheckCircle,
  Wand2,
  Copy,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePromptStore } from '@/stores/promptStore';
import { useAuthStore } from '@/stores/authStore';
import { AuthGate } from '@/components/gating/FeatureGate';
import { 
  BUILDER_STEPS, 
  OUTPUT_TYPES, 
  TONE_STYLES, 
  AI_MODELS,
  OutputType,
  AIModel,
  ToneStyle,
  Category
} from '@/types/prompt';
import { cn } from '@/lib/utils';
import LivePromptPreview from '@/components/builder/LivePromptPreview';
import { supabase } from '@/integrations/supabase/client';
import { localizeApiError } from '@/i18n/lang';

const stepIcons = {
  Target, Layers, Cpu, Palette, Users, Lock, Sparkles, CheckCircle
};

export default function GuidedBuilder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { 
    builderState, 
    updateBuilderState, 
    nextStep, 
    prevStep, 
    goToStep,
    resetBuilderState,
    addPrompt 
  } = usePromptStore();

  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [newConstraint, setNewConstraint] = useState('');

  const canProceed = () => {
    switch (builderState.step) {
      case 0: return builderState.objective.length > 10;
      case 1: return builderState.outputType !== null;
      case 2: return true; // Model is optional
      case 3: return builderState.tone !== null;
      case 4: return true; // Audience is optional
      case 5: return true; // Constraints are optional
      case 6: return true; // Creativity level always has a value
      default: return true;
    }
  };

  const addConstraint = () => {
    if (newConstraint.trim()) {
      setConstraints([...constraints, newConstraint.trim()]);
      updateBuilderState({ constraints: [...constraints, newConstraint.trim()] });
      setNewConstraint('');
    }
  };

  const removeConstraint = (index: number) => {
    const updated = constraints.filter((_, i) => i !== index);
    setConstraints(updated);
    updateBuilderState({ constraints: updated });
  };

  const { i18n } = useTranslation();
  const uiLanguage = (i18n.resolvedLanguage || i18n.language || 'pt').slice(0, 2);
  const isEnglish = uiLanguage === 'en';
  const translateStep = (id: string, value: string, type: 'title' | 'description') => {
    if (!isEnglish) return value;
    const map: Record<string, { title: string; description: string }> = {
      objective: { title: 'Objective', description: 'What do you want to achieve?' },
      output: { title: 'Output Type', description: 'What type of content?' },
      model: { title: 'AI Model', description: 'Which AI is this for?' },
      tone: { title: 'Tone & Style', description: 'How should it sound?' },
      audience: { title: 'Target Audience', description: 'Who is it for?' },
      constraints: { title: 'Constraints', description: 'Limits and format' },
      creativity: { title: 'Creativity', description: 'Level of freedom' },
      review: { title: 'Review', description: 'Confirm and generate' },
    };
    return map[id]?.[type] || value;
  };
  const outputLabel = (value: OutputType | null) => {
    const label = OUTPUT_TYPES.find(t => t.value === value)?.label;
    if (!label) return '';
    if (!isEnglish) return label;
    return ({ Texto: 'Text', Imagem: 'Image', Código: 'Code', Vídeo: 'Video', Áudio: 'Audio' } as Record<string, string>)[label] || label;
  };
  const modelLabel = (label: string) => {
    if (!isEnglish) return label;
    return ({
      'Genérico (qualquer IA)': 'Generic (any AI)',
    } as Record<string, string>)[label] || label;
  };
  const toneLabel = (label: string) => {
    if (!isEnglish) return label;
    return ({
      Profissional: 'Professional',
      Casual: 'Casual',
      'Amigável': 'Friendly',
      Formal: 'Formal',
      Criativo: 'Creative',
      Técnico: 'Technical',
      Humorístico: 'Humorous',
      Persuasivo: 'Persuasive',
      Informativo: 'Informative',
      Narrativo: 'Narrative',
    } as Record<string, string>)[label] || label;
  };
  const toneDescription = (description: string) => {
    if (!isEnglish) return description;
    return ({
      'Formal e business-like': 'Formal and business-like',
      'Relaxado e conversacional': 'Relaxed and conversational',
      'Caloroso e acessível': 'Warm and approachable',
      'Sério e institucional': 'Serious and institutional',
      'Expressivo e artístico': 'Expressive and artistic',
      'Preciso e especializado': 'Precise and specialized',
      'Divertido e leve': 'Fun and light',
      'Convincente e impactante': 'Convincing and impactful',
      'Educativo e claro': 'Educational and clear',
      Storytelling: 'Storytelling',
    } as Record<string, string>)[description] || description;
  };

  const generatePrompt = async () => {
    const { objective, outputType, targetModel, tone, targetAudience, constraints, creativityLevel, format, language } = builderState;
    
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-prompt', {
        body: { 
          objective, 
          outputType, 
          targetModel, 
          tone, 
          targetAudience, 
          constraints, 
          creativityLevel,
          format,
          language: language || uiLanguage,
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: isEnglish ? 'Error' : 'Erro', description: localizeApiError(data.error, isEnglish), variant: 'destructive' });
        setIsGenerating(false);
        return;
      }

      setGeneratedPrompt(data.prompt);
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast({ title: isEnglish ? 'Error' : 'Erro', description: isEnglish ? 'Could not generate the prompt. Try again.' : 'Não foi possível gerar o prompt. Tenta novamente.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const savePrompt = () => {
    if (!generatedPrompt) {
      toast({ title: isEnglish ? 'Error' : 'Erro', description: isEnglish ? 'Generate the prompt first' : 'Gera primeiro o prompt', variant: 'destructive' });
      return;
    }

    const promptId = addPrompt({
      title: builderState.objective.substring(0, 50) + (builderState.objective.length > 50 ? '...' : ''),
      content: generatedPrompt,
      description: builderState.objective,
      category: mapOutputToCategory(builderState.outputType),
      tags: [builderState.tone || '', builderState.outputType || ''].filter(Boolean),
      outputType: builderState.outputType || 'text',
      targetModel: builderState.targetModel,
      tone: builderState.tone || undefined,
      variables: [],
      isFavorite: false,
    });

    toast({ title: isEnglish ? 'Success!' : 'Sucesso!', description: isEnglish ? 'Prompt saved to library' : 'Prompt guardado na biblioteca' });
    resetBuilderState();
    navigate('/library');
  };

  const mapOutputToCategory = (output: OutputType | null): Category => {
    const mapping: Record<OutputType, Category> = {
      text: 'writing',
      image: 'image',
      code: 'code',
      video: 'video',
      audio: 'audio',
    };
    return output ? mapping[output] : 'other';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    toast({ title: isEnglish ? 'Copied!' : 'Copiado!', description: isEnglish ? 'Prompt copied to clipboard' : 'Prompt copiado para a área de transferência' });
  };

  const renderStepContent = () => {
    switch (builderState.step) {
      case 0: // Objective
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {isEnglish ? 'What is your objective with this prompt?' : 'Qual é o teu objetivo com este prompt?'}
              </label>
              <Textarea
                placeholder={isEnglish ? 'Ex: Create an Instagram post about sustainability that drives engagement...' : 'Ex: Criar um post para Instagram sobre sustentabilidade que gere engagement...'}
                value={builderState.objective}
                onChange={(e) => updateBuilderState({ objective: e.target.value })}
                className="min-h-[120px] text-base"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {isEnglish ? 'Be as specific as possible. The more detail, the better the result.' : 'Sê o mais específico possível. Quanto mais detalhes, melhor o resultado.'}
              </p>
            </div>
          </div>
        );

      case 1: // Output Type
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {OUTPUT_TYPES.map((type) => (
              <Card
                key={type.value}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/50',
                  builderState.outputType === type.value && 'border-primary ring-2 ring-primary/20'
                )}
                onClick={() => updateBuilderState({ outputType: type.value })}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg',
                    builderState.outputType === type.value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {type.icon === 'FileText' && <Target className="h-6 w-6" />}
                    {type.icon === 'Image' && <Layers className="h-6 w-6" />}
                    {type.icon === 'Code' && <Cpu className="h-6 w-6" />}
                    {type.icon === 'Video' && <Palette className="h-6 w-6" />}
                    {type.icon === 'Music' && <Users className="h-6 w-6" />}
                  </div>
                  <div>
                    <p className="font-medium">{outputLabel(type.value)}</p>
                    <p className="text-sm text-muted-foreground">{isEnglish ? ({ 'Artigos, emails, posts, copy': 'Articles, emails, posts, copy', 'Fotos, ilustrações, arte': 'Photos, illustrations, art', 'Programação, scripts, queries': 'Programming, scripts, queries', 'Vídeos, animações, clips': 'Videos, animations, clips', 'Música, podcasts, voiceover': 'Music, podcasts, voice-over' } as Record<string, string>)[type.description] || type.description : type.description}</p>
                  </div>
                  {builderState.outputType === type.value && (
                    <Check className="ml-auto h-5 w-5 text-primary" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 2: // AI Model
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isEnglish ? 'Choose the AI model to optimize the prompt (or keep it generic)' : 'Escolhe o modelo de IA para otimizar o prompt (ou deixa genérico)'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {AI_MODELS.filter(m => 
                !builderState.outputType || m.type.includes(builderState.outputType)
              ).map((model) => (
                <Card
                  key={model.value}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    builderState.targetModel === model.value && 'border-primary ring-2 ring-primary/20'
                  )}
                  onClick={() => updateBuilderState({ targetModel: model.value })}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <span className="font-medium">{modelLabel(model.label)}</span>
                    {builderState.targetModel === model.value && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3: // Tone & Style
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TONE_STYLES.map((tone) => (
              <Card
                key={tone.value}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/50',
                  builderState.tone === tone.value && 'border-primary ring-2 ring-primary/20'
                )}
                onClick={() => updateBuilderState({ tone: tone.value })}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{toneLabel(tone.label)}</p>
                    <p className="text-sm text-muted-foreground">{toneDescription(tone.description)}</p>
                  </div>
                  {builderState.tone === tone.value && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 4: // Target Audience
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {isEnglish ? 'Who is this content for?' : 'Para quem é este conteúdo?'}
              </label>
              <Textarea
                placeholder={isEnglish ? 'Ex: Young adults 25-35 interested in tech and sustainable lifestyle...' : 'Ex: Jovens adultos 25-35 anos interessados em tecnologia e lifestyle sustentável...'}
                value={builderState.targetAudience}
                onChange={(e) => updateBuilderState({ targetAudience: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[(isEnglish ? 'Professionals' : 'Profissionais'), (isEnglish ? 'Students' : 'Estudantes'), (isEnglish ? 'Companies' : 'Empresas'), (isEnglish ? 'General audience' : 'Público geral')].map((audience) => (
                <Button
                  key={audience}
                  variant="outline"
                  size="sm"
                  onClick={() => updateBuilderState({ 
                    targetAudience: builderState.targetAudience 
                      ? `${builderState.targetAudience}, ${audience.toLowerCase()}`
                      : audience
                  })}
                >
                  + {audience}
                </Button>
              ))}
            </div>
          </div>
        );

      case 5: // Constraints
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{isEnglish ? 'Output format' : 'Formato do output'}</label>
                <Input
                  placeholder={isEnglish ? 'Ex: Bullet list, single paragraph...' : 'Ex: Lista com bullet points, parágrafo único...'}
                  value={builderState.format}
                  onChange={(e) => updateBuilderState({ format: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{isEnglish ? 'Language' : 'Idioma'}</label>
                <Input
                  placeholder={isEnglish ? 'English' : 'Português'}
                  value={builderState.language}
                  onChange={(e) => updateBuilderState({ language: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">{isEnglish ? 'Additional constraints' : 'Restrições adicionais'}</label>
              <div className="flex gap-2">
                <Input
                  placeholder={isEnglish ? 'Ex: Max 280 characters, avoid technical jargon...' : 'Ex: Máximo 280 caracteres, evitar jargão técnico...'}
                  value={newConstraint}
                  onChange={(e) => setNewConstraint(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addConstraint()}
                />
                <Button onClick={addConstraint}>{isEnglish ? 'Add' : 'Adicionar'}</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {constraints.map((c, i) => (
                  <Badge 
                    key={i} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeConstraint(i)}
                  >
                    {c} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case 6: // Creativity Level
        return (
          <div className="space-y-8">
            <div>
              <div className="flex justify-between mb-4">
                <span className="text-sm font-medium">{isEnglish ? 'Creativity Level' : 'Nível de Criatividade'}</span>
                <span className="text-sm text-muted-foreground">{builderState.creativityLevel}%</span>
              </div>
              <Slider
                value={[builderState.creativityLevel]}
                onValueChange={(value) => updateBuilderState({ creativityLevel: value[0] })}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{isEnglish ? '🎯 Controlled' : '🎯 Controlado'}</span>
                <span>{isEnglish ? '⚖️ Balanced' : '⚖️ Equilibrado'}</span>
                <span>{isEnglish ? '🎨 Creative' : '🎨 Criativo'}</span>
              </div>
            </div>
            
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-sm">
                  {builderState.creativityLevel < 30 && 
                    (isEnglish ? "The prompt will be highly structured and predictable. Ideal for outputs that need consistency." : "O prompt será muito estruturado e previsível. Ideal para outputs que precisam de consistência.")}
                  {builderState.creativityLevel >= 30 && builderState.creativityLevel < 70 &&
                    (isEnglish ? "Balance between structure and creative freedom. Good for most cases." : "Equilíbrio entre estrutura e liberdade criativa. Bom para a maioria dos casos.")}
                  {builderState.creativityLevel >= 70 &&
                    (isEnglish ? "The prompt will encourage original and unexpected responses. Great for brainstorming and art." : "O prompt incentivará respostas originais e inesperadas. Ótimo para brainstorming e arte.")}
                </p>
              </CardContent>
            </Card>

            <div>
              <label className="text-sm font-medium mb-2 block">{isEnglish ? 'Additional context (optional)' : 'Contexto adicional (opcional)'}</label>
              <Textarea
                placeholder={isEnglish ? 'Extra information that can help the AI better understand what you need...' : 'Informação extra que possa ajudar a IA a entender melhor o que precisas...'}
                value={builderState.additionalContext}
                onChange={(e) => updateBuilderState({ additionalContext: e.target.value })}
              />
            </div>
          </div>
        );

      case 7: // Review
        return (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>{isEnglish ? 'Prompt Summary' : 'Resumo do Prompt'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{isEnglish ? 'Objective:' : 'Objetivo:'}</span>
                    <p className="font-medium">{builderState.objective.substring(0, 100)}...</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isEnglish ? 'Type:' : 'Tipo:'}</span>
                    <p className="font-medium">{outputLabel(builderState.outputType)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isEnglish ? 'Tone:' : 'Tom:'}</span>
                    <p className="font-medium">{toneLabel(TONE_STYLES.find(t => t.value === builderState.tone)?.label || '')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isEnglish ? 'Creativity:' : 'Criatividade:'}</span>
                    <p className="font-medium">{builderState.creativityLevel}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            {!generatedPrompt && (
              <Button onClick={generatePrompt} size="lg" className="w-full gap-2" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {isEnglish ? 'Generating with AI...' : 'A gerar com IA...'}
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" />
                    {isEnglish ? 'Generate Prompt with AI' : 'Gerar Prompt com IA'}
                  </>
                )}
              </Button>
            )}

            {/* Generated Prompt */}
            {generatedPrompt && (
              <Card className="border-primary">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {isEnglish ? 'Generated Prompt' : 'Prompt Gerado'}
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    {isEnglish ? 'Copy' : 'Copiar'}
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg">
                    {generatedPrompt}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Save Button */}
            {generatedPrompt && (
              <Button onClick={savePrompt} size="lg" className="w-full gap-2">
                <Check className="h-5 w-5" />
                {isEnglish ? 'Save to Library' : 'Guardar na Biblioteca'}
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Require authentication to use the builder
  if (!user) {
    return (
      <div className="p-6 animate-fade-in">
        <Card>
          <AuthGate message={isEnglish ? 'Create a free account to start building professional prompts.' : 'Cria uma conta gratuita para começar a construir prompts profissionais.'} />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Builder */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {BUILDER_STEPS.map((step, index) => {
                const Icon = stepIcons[step.icon as keyof typeof stepIcons] || Target;
                const isCompleted = index < builderState.step;
                const isCurrent = index === builderState.step;
                
                return (
                  <div
                    key={step.id}
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => index <= builderState.step && goToStep(index)}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                        isCompleted && 'bg-primary border-primary text-primary-foreground',
                        isCurrent && 'border-primary text-primary',
                        !isCompleted && !isCurrent && 'border-muted text-muted-foreground'
                      )}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={cn(
                      'text-xs mt-1 hidden md:block',
                      (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {translateStep(step.id, step.title, 'title')}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((builderState.step + 1) / BUILDER_STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{translateStep(BUILDER_STEPS[builderState.step].id, BUILDER_STEPS[builderState.step].title, 'title')}</CardTitle>
              <CardDescription>{translateStep(BUILDER_STEPS[builderState.step].id, BUILDER_STEPS[builderState.step].description, 'description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                <motion.div
                  key={builderState.step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
              
              {/* Micro-feedback */}
              {builderState.step < 7 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-primary" />
                    {builderState.step === 0 && (isEnglish ? 'This field defines prompt clarity. Be specific for better results.' : 'Este campo define a clareza do teu prompt. Sê específico para melhores resultados.')}
                    {builderState.step === 1 && (isEnglish ? 'Output type helps the AI format the answer correctly.' : 'O tipo de output ajuda a IA a formatar a resposta corretamente.')}
                    {builderState.step === 2 && (isEnglish ? 'Different models have different strengths. Choose the best fit.' : 'Modelos diferentes têm capacidades diferentes. Escolhe o mais adequado.')}
                    {builderState.step === 3 && (isEnglish ? 'Tone defines output personality and affects final quality.' : 'O tom define a personalidade do output. Afeta diretamente o score final.')}
                    {builderState.step === 4 && (isEnglish ? 'Defining the audience helps AI adapt language and complexity.' : 'Definir o público ajuda a IA a adaptar a linguagem e complexidade.')}
                    {builderState.step === 5 && (isEnglish ? 'Clear constraints reduce ambiguity and improve quality.' : 'Restrições claras reduzem ambiguidade e aumentam a qualidade.')}
                    {builderState.step === 6 && (isEnglish ? 'Balance control and creative freedom according to your goal.' : 'Equilibra controlo e liberdade criativa conforme o teu objetivo.')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={builderState.step === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              {isEnglish ? 'Previous' : 'Anterior'}
            </Button>
            
            {builderState.step < 7 && (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
              >
                {isEnglish ? 'Next' : 'Seguinte'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Live Preview Sidebar */}
        <div className="hidden lg:block">
          <LivePromptPreview builderState={builderState} />
        </div>
      </div>
    </div>
  );
}
