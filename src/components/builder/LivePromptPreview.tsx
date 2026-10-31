import { useMemo } from 'react';
import { Eye, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GuidedBuilderState, TONE_STYLES, OUTPUT_TYPES, OUTPUT_TYPE_LABEL_EN, TONE_LABEL_EN } from '@/types/prompt';
import { useTranslation } from 'react-i18next';

interface LivePromptPreviewProps {
  builderState: GuidedBuilderState;
}

export default function LivePromptPreview({ builderState }: LivePromptPreviewProps) {
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
  const { objective, outputType, targetModel, tone, targetAudience, constraints, format, language, creativityLevel } = builderState;

  const previewSections = useMemo(() => {
    const sections: { type: 'context' | 'instruction' | 'restriction' | 'output'; label: string; content: string }[] = [];
    
    // Context section
    if (objective || targetAudience) {
      let contextContent = '';
      if (objective) contextContent += `${isEnglish ? 'Objective' : 'Objetivo'}: ${objective}\n`;
      if (targetAudience) contextContent += `${isEnglish ? 'Target audience' : 'Público-alvo'}: ${targetAudience}`;
      sections.push({ type: 'context', label: isEnglish ? 'Context' : 'Contexto', content: contextContent.trim() });
    }
    
    // Instructions section
    const outputLabel = (isEnglish && outputType ? OUTPUT_TYPE_LABEL_EN[outputType] : OUTPUT_TYPES.find(t => t.value === outputType)?.label) || (isEnglish ? 'content' : 'conteúdo');
    const toneLabel = (isEnglish && tone ? TONE_LABEL_EN[tone] : TONE_STYLES.find(t => t.value === tone)?.label)?.toLowerCase();
    
    let instructionContent = `${isEnglish ? 'Generate' : 'Gera'} ${outputLabel.toLowerCase()} ${isEnglish ? 'that:' : 'que:'}\n`;
    instructionContent += `${isEnglish ? '- Meets the defined objective' : '- Cumpra o objetivo definido'}\n`;
    if (tone) instructionContent += `${isEnglish ? '- Uses a' : '- Use um'} ${isEnglish ? 'tone' : 'tom'} ${toneLabel}\n`;
    if (creativityLevel > 70) instructionContent += `${isEnglish ? '- Is creative and original' : '- Seja criativo e original'}\n`;
    if (creativityLevel < 30) instructionContent += `${isEnglish ? '- Follows a conservative structure' : '- Siga uma estrutura conservadora'}\n`;
    
    if (outputType || tone) {
      sections.push({ type: 'instruction', label: isEnglish ? 'Instructions' : 'Instruções', content: instructionContent.trim() });
    }
    
    // Restrictions section
    if (constraints.length > 0 || format || language !== 'pt') {
      let restrictionContent = '';
      if (format) restrictionContent += `${isEnglish ? 'Format' : 'Formato'}: ${format}\n`;
      if (language && language !== 'pt') restrictionContent += `${isEnglish ? 'Language' : 'Idioma'}: ${language}\n`;
      constraints.forEach(c => {
        restrictionContent += `- ${c}\n`;
      });
      if (restrictionContent) {
        sections.push({ type: 'restriction', label: isEnglish ? 'Constraints' : 'Restrições', content: restrictionContent.trim() });
      }
    }
    
    // Output section
    if (outputType) {
      let outputContent = '';
      switch (outputType) {
        case 'text':
          outputContent = isEnglish ? 'Deliver a well-structured, clear, ready-to-use text.' : 'Entrega um texto bem estruturado, claro e pronto para usar.';
          break;
        case 'image':
          outputContent = isEnglish ? 'Detailed image-generation description with clear style and composition.' : 'Descrição detalhada para geração de imagem com estilo e composição claros.';
          break;
        case 'code':
          outputContent = isEnglish ? 'Functional, documented code following best practices.' : 'Código funcional, comentado e seguindo boas práticas.';
          break;
        case 'video':
          outputContent = isEnglish ? 'Scene description, camera movements and visual elements.' : 'Descrição de cena, movimentos de câmara e elementos visuais.';
          break;
        case 'audio':
          outputContent = isEnglish ? 'Tone, rhythm and mood specifications.' : 'Especificações de tom, ritmo e mood.';
          break;
      }
      sections.push({ type: 'output', label: isEnglish ? 'Expected Output' : 'Output Esperado', content: outputContent });
    }
    
    return sections;
  }, [objective, outputType, tone, targetAudience, constraints, format, language, creativityLevel, isEnglish]);

  const getSectionStyles = (type: string) => {
    switch (type) {
      case 'context':
        return 'border-context/40 bg-context/10';
      case 'instruction':
        return 'border-instruction/40 bg-instruction/10';
      case 'restriction':
        return 'border-restriction/40 bg-restriction/10';
      case 'output':
        return 'border-output/40 bg-output/10';
      default:
        return 'border-border bg-muted/50';
    }
  };

  const getSectionTextColor = (type: string) => {
    switch (type) {
      case 'context':
        return 'text-context';
      case 'instruction':
        return 'text-instruction';
      case 'restriction':
        return 'text-restriction';
      case 'output':
        return 'text-output';
      default:
        return 'text-foreground';
    }
  };

  const hasContent = previewSections.length > 0;

  return (
    <Card className="sticky top-4 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          {isEnglish ? 'Live Preview' : 'Pré-visualização em Tempo Real'}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {isEnglish ? 'Your prompt is being built as you fill in fields' : 'O teu prompt está a ser construído enquanto preenches'}
        </p>
      </CardHeader>
      <CardContent>
        {hasContent ? (
          <div className="space-y-3">
            {previewSections.map((section, index) => (
              <div 
                key={index}
                className={`rounded-lg border p-3 transition-all ${getSectionStyles(section.type)}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`text-[0.625rem] ${getSectionTextColor(section.type)} border-current`}>
                    {section.label}
                  </Badge>
                </div>
                <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/80">
                  {section.content}
                </pre>
              </div>
            ))}
            
            {/* Completion indicator */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <div className="flex gap-1">
                {['context', 'instruction', 'restriction', 'output'].map((type) => {
                  const hasSection = previewSections.some(s => s.type === type);
                  return (
                    <div 
                      key={type}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        hasSection ? 'bg-success' : 'bg-muted'
                      }`}
                      title={type}
                    />
                  );
                })}
              </div>
              <span className="text-[0.625rem] text-muted-foreground">
                {previewSections.length}/4 {isEnglish ? 'sections defined' : 'secções definidas'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {isEnglish ? 'Start filling fields to preview the prompt' : 'Começa a preencher para ver o prompt'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {isEnglish ? 'Each field appears here in real time' : 'Cada campo que preenches aparece aqui em tempo real'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
