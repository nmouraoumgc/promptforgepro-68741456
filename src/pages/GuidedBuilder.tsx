import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePromptStore } from '@/stores/promptStore';
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

const stepIcons = {
  Target, Layers, Cpu, Palette, Users, Lock, Sparkles, CheckCircle
};

export default function GuidedBuilder() {
  const navigate = useNavigate();
  const { toast } = useToast();
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

  const generatePrompt = () => {
    const { objective, outputType, targetModel, tone, targetAudience, constraints, creativityLevel, format, language } = builderState;
    
    let prompt = '';
    
    // Context
    prompt += `[CONTEXTO]\n`;
    prompt += `Objetivo: ${objective}\n`;
    if (targetAudience) prompt += `Público-alvo: ${targetAudience}\n`;
    prompt += `\n`;
    
    // Instructions
    prompt += `[INSTRUÇÕES]\n`;
    prompt += `Gera ${outputType === 'text' ? 'um texto' : outputType === 'image' ? 'uma imagem' : outputType === 'code' ? 'código' : outputType === 'video' ? 'um vídeo' : 'áudio'} que:\n`;
    prompt += `- Cumpra o objetivo definido acima\n`;
    if (tone) prompt += `- Use um tom ${TONE_STYLES.find(t => t.value === tone)?.label.toLowerCase()}\n`;
    if (creativityLevel > 70) prompt += `- Seja criativo e original nas abordagens\n`;
    if (creativityLevel < 30) prompt += `- Siga uma estrutura conservadora e previsível\n`;
    prompt += `\n`;
    
    // Constraints
    if (constraints.length > 0 || format || language !== 'pt') {
      prompt += `[RESTRIÇÕES]\n`;
      if (format) prompt += `- Formato: ${format}\n`;
      if (language !== 'pt') prompt += `- Idioma: ${language}\n`;
      constraints.forEach(c => {
        prompt += `- ${c}\n`;
      });
      prompt += `\n`;
    }
    
    // Output expectation
    prompt += `[OUTPUT ESPERADO]\n`;
    switch (outputType) {
      case 'text':
        prompt += `Entrega um texto bem estruturado, claro e pronto para usar.`;
        break;
      case 'image':
        prompt += `Descrição detalhada para geração de imagem com estilo, composição e elementos visuais claros.`;
        break;
      case 'code':
        prompt += `Código funcional, comentado e seguindo boas práticas.`;
        break;
      case 'video':
        prompt += `Descrição de cena, movimentos de câmara, timing e elementos visuais.`;
        break;
      case 'audio':
        prompt += `Especificações de tom, ritmo, instrumentação e mood.`;
        break;
    }
    
    setGeneratedPrompt(prompt);
  };

  const savePrompt = () => {
    if (!generatedPrompt) {
      toast({ title: 'Erro', description: 'Gera primeiro o prompt', variant: 'destructive' });
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

    toast({ title: 'Sucesso!', description: 'Prompt guardado na biblioteca' });
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
    toast({ title: 'Copiado!', description: 'Prompt copiado para a área de transferência' });
  };

  const renderStepContent = () => {
    switch (builderState.step) {
      case 0: // Objective
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Qual é o teu objetivo com este prompt?
              </label>
              <Textarea
                placeholder="Ex: Criar um post para Instagram sobre sustentabilidade que gere engagement..."
                value={builderState.objective}
                onChange={(e) => updateBuilderState({ objective: e.target.value })}
                className="min-h-[120px] text-base"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Sê o mais específico possível. Quanto mais detalhes, melhor o resultado.
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
                    <p className="font-medium">{type.label}</p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
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
              Escolhe o modelo de IA para otimizar o prompt (ou deixa genérico)
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
                    <span className="font-medium">{model.label}</span>
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
                    <p className="font-medium">{tone.label}</p>
                    <p className="text-sm text-muted-foreground">{tone.description}</p>
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
                Para quem é este conteúdo?
              </label>
              <Textarea
                placeholder="Ex: Jovens adultos 25-35 anos interessados em tecnologia e lifestyle sustentável..."
                value={builderState.targetAudience}
                onChange={(e) => updateBuilderState({ targetAudience: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['Profissionais', 'Estudantes', 'Empresas', 'Público geral'].map((audience) => (
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
                <label className="text-sm font-medium mb-2 block">Formato do output</label>
                <Input
                  placeholder="Ex: Lista com bullet points, parágrafo único..."
                  value={builderState.format}
                  onChange={(e) => updateBuilderState({ format: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Idioma</label>
                <Input
                  placeholder="Português"
                  value={builderState.language}
                  onChange={(e) => updateBuilderState({ language: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Restrições adicionais</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Máximo 280 caracteres, evitar jargão técnico..."
                  value={newConstraint}
                  onChange={(e) => setNewConstraint(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addConstraint()}
                />
                <Button onClick={addConstraint}>Adicionar</Button>
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
                <span className="text-sm font-medium">Nível de Criatividade</span>
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
                <span>🎯 Controlado</span>
                <span>⚖️ Equilibrado</span>
                <span>🎨 Criativo</span>
              </div>
            </div>
            
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-sm">
                  {builderState.creativityLevel < 30 && 
                    "O prompt será muito estruturado e previsível. Ideal para outputs que precisam de consistência."}
                  {builderState.creativityLevel >= 30 && builderState.creativityLevel < 70 &&
                    "Equilíbrio entre estrutura e liberdade criativa. Bom para a maioria dos casos."}
                  {builderState.creativityLevel >= 70 &&
                    "O prompt incentivará respostas originais e inesperadas. Ótimo para brainstorming e arte."}
                </p>
              </CardContent>
            </Card>

            <div>
              <label className="text-sm font-medium mb-2 block">Contexto adicional (opcional)</label>
              <Textarea
                placeholder="Informação extra que possa ajudar a IA a entender melhor o que precisas..."
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
                <CardTitle>Resumo do Prompt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Objetivo:</span>
                    <p className="font-medium">{builderState.objective.substring(0, 100)}...</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium">{OUTPUT_TYPES.find(t => t.value === builderState.outputType)?.label}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tom:</span>
                    <p className="font-medium">{TONE_STYLES.find(t => t.value === builderState.tone)?.label}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Criatividade:</span>
                    <p className="font-medium">{builderState.creativityLevel}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            {!generatedPrompt && (
              <Button onClick={generatePrompt} size="lg" className="w-full gap-2">
                <Wand2 className="h-5 w-5" />
                Gerar Prompt
              </Button>
            )}

            {/* Generated Prompt */}
            {generatedPrompt && (
              <Card className="border-primary">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Prompt Gerado
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
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
                Guardar na Biblioteca
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
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
                  {step.title}
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
          <CardTitle>{BUILDER_STEPS[builderState.step].title}</CardTitle>
          <CardDescription>{BUILDER_STEPS[builderState.step].description}</CardDescription>
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
          Anterior
        </Button>
        
        {builderState.step < 7 && (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
          >
            Seguinte
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
