import { useState, useRef, useCallback } from 'react';
import { Zap, Mic, MicOff, Copy, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { AuthGate } from '@/components/gating/FeatureGate';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function QuickPrompt() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  const [request, setRequest] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Require authentication
  if (!user) {
    return (
      <div className="p-6 animate-fade-in">
        <Card>
          <AuthGate message="Cria uma conta gratuita para usar o Quick Prompt. / Create a free account to use Quick Prompt." />
        </Card>
      </div>
    );
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processAudio();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: '🎙️ A gravar...',
        description: 'Fala agora. Clica novamente para parar. / Speak now. Click again to stop.',
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aceder ao microfone. Verifica as permissões. / Could not access microphone. Check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) return;
    
    setIsTranscribing(true);
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });
      
      if (error) throw error;
      
      if (data.error) {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' });
        return;
      }
      
      if (data.text) {
        setRequest(prev => prev ? `${prev} ${data.text}` : data.text);
        toast({
          title: '✓ Transcrição concluída',
          description: 'O texto foi adicionado ao pedido. / Text has been added to the request.',
        });
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível transcrever o áudio. Tenta novamente. / Could not transcribe audio. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const generatePrompt = async () => {
    if (!request.trim()) {
      toast({ 
        title: 'Atenção', 
        description: 'Escreve ou dita o que precisas. / Write or speak what you need.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('quick-prompt', {
        body: { request }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' });
        return;
      }

      setGeneratedPrompt(data.prompt);
      
      toast({
        title: data.language === 'en' ? '✓ Prompt generated!' : '✓ Prompt gerado!',
        description: data.language === 'en' ? 'Your prompt is ready to use.' : 'O teu prompt está pronto a usar.',
      });
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível gerar o prompt. Tenta novamente. / Could not generate prompt. Try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    toast({ 
      title: 'Copiado! / Copied!', 
      description: 'Prompt copiado para a área de transferência. / Prompt copied to clipboard.' 
    });
  };

  const reset = () => {
    setRequest('');
    setGeneratedPrompt('');
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
          <Zap className="h-5 w-5" />
          <span className="font-semibold">Quick Prompt</span>
        </div>
        <h1 className="text-2xl font-bold">Gera prompts instantâneos</h1>
        <p className="text-muted-foreground">
          Escreve ou dita o que precisas e recebe um prompt otimizado em segundos.
          <br />
          <span className="text-sm">Write or speak what you need and get an optimized prompt in seconds.</span>
        </p>
      </div>

      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            O que precisas? / What do you need?
          </CardTitle>
          <CardDescription>
            Descreve em poucas palavras o que queres que o prompt faça. Suporta PT e EN.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea
              placeholder="Ex: Um email formal para pedir aumento de salário... / A formal email to request a salary raise..."
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              className="min-h-[120px] pr-14 text-base"
              disabled={isRecording || isTranscribing}
            />
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-2 top-2 h-10 w-10 rounded-full transition-all",
                isRecording && "bg-destructive text-destructive-foreground animate-pulse",
                isTranscribing && "bg-primary/20"
              )}
              onClick={handleMicClick}
              disabled={isTranscribing || isGenerating}
            >
              {isTranscribing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-destructive animate-pulse">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              A gravar... Clica no microfone para parar. / Recording... Click the mic to stop.
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={generatePrompt} 
              disabled={isGenerating || !request.trim() || isRecording}
              className="flex-1"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A gerar...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Gerar Prompt
                </>
              )}
            </Button>
            {(request || generatedPrompt) && (
              <Button variant="outline" size="lg" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generated Prompt */}
      {generatedPrompt && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Prompt Gerado / Generated Prompt
              </CardTitle>
              <CardDescription>
                Pronto a usar! / Ready to use!
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-mono text-sm bg-background p-4 rounded-lg border">
              {generatedPrompt}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-lg">🎯</span>
              <div>
                <p className="font-medium">Sê específico</p>
                <p className="text-muted-foreground text-xs">Quanto mais detalhe, melhor o resultado.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">🎙️</span>
              <div>
                <p className="font-medium">Usa a voz</p>
                <p className="text-muted-foreground text-xs">Clica no microfone para ditar.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">🌍</span>
              <div>
                <p className="font-medium">PT ou EN</p>
                <p className="text-muted-foreground text-xs">Funciona em ambos os idiomas.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
