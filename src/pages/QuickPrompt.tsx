import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Mic, MicOff, Copy, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { AuthGate } from '@/components/gating/FeatureGate';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { localizeApiError } from '@/i18n/lang';

export default function QuickPrompt() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || i18n.language || 'pt').slice(0, 2);

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
          <AuthGate message={t('quickPrompt.authRequired')} />
        </Card>
      </div>
    );
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        await processAudio();
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      toast({ title: t('quickPrompt.recordingToast'), description: t('quickPrompt.recordingDesc') });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({ title: t('common.error'), description: t('quickPrompt.micError'), variant: 'destructive' });
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
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio, language },
      });
      if (error) throw error;
      if (data.error) {
        toast({ title: t('common.error'), description: localizeApiError(data.error, (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en')), variant: 'destructive' });
        return;
      }
      if (data.text) {
        setRequest((prev) => (prev ? `${prev} ${data.text}` : data.text));
        toast({ title: t('quickPrompt.transcribed'), description: t('quickPrompt.transcribedDesc') });
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({ title: t('common.error'), description: t('quickPrompt.transcribeError'), variant: 'destructive' });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleMicClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const generatePrompt = async () => {
    if (!request.trim()) {
      toast({ title: t('common.warning'), description: t('quickPrompt.needText'), variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('quick-prompt', {
        body: { request, language },
      });
      if (error) throw error;
      if (data.error) {
        toast({ title: t('common.error'), description: localizeApiError(data.error, (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en')), variant: 'destructive' });
        return;
      }
      setGeneratedPrompt(data.prompt);
      toast({ title: t('quickPrompt.generated'), description: t('quickPrompt.generatedDesc') });
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast({ title: t('common.error'), description: t('quickPrompt.generateError'), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    toast({ title: t('common.copied'), description: t('quickPrompt.copiedDesc') });
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
          <span className="font-semibold">{t('quickPrompt.badge')}</span>
        </div>
        <h1 className="text-2xl font-bold">{t('quickPrompt.title')}</h1>
        <p className="text-muted-foreground">{t('quickPrompt.description')}</p>
      </div>

      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t('quickPrompt.inputTitle')}
          </CardTitle>
          <CardDescription>{t('quickPrompt.inputDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea
              placeholder={t('quickPrompt.placeholder')}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              className="min-h-[120px] pr-14 text-base"
              disabled={isRecording || isTranscribing}
            />
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute right-2 top-2 h-10 w-10 rounded-full transition-all',
                isRecording && 'bg-destructive text-destructive-foreground animate-pulse',
                isTranscribing && 'bg-primary/20'
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
              {t('quickPrompt.recording')}
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
                  {t('quickPrompt.generating')}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {t('quickPrompt.generate')}
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
                {t('quickPrompt.resultTitle')}
              </CardTitle>
              <CardDescription>{t('quickPrompt.resultDesc')}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              {t('common.copy')}
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
                <p className="font-medium">{t('quickPrompt.tipSpecific')}</p>
                <p className="text-muted-foreground text-xs">{t('quickPrompt.tipSpecificDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">🎙️</span>
              <div>
                <p className="font-medium">{t('quickPrompt.tipVoice')}</p>
                <p className="text-muted-foreground text-xs">{t('quickPrompt.tipVoiceDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">🌍</span>
              <div>
                <p className="font-medium">{t('quickPrompt.tipLanguage')}</p>
                <p className="text-muted-foreground text-xs">{t('quickPrompt.tipLanguageDesc')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
