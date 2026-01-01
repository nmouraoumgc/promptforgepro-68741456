import { Package, Crown, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const packs = [
  { name: 'TikTok Viral', description: 'Scripts e hooks para vídeos virais', count: 15, icon: '🎬', premium: false },
  { name: 'Instagram Reels', description: 'Legendas e CTAs que convertem', count: 20, icon: '📱', premium: false },
  { name: 'Midjourney Pro', description: 'Prompts fotorealistas avançados', count: 25, icon: '🎨', premium: true },
  { name: 'Email Marketing', description: 'Emails de vendas que abrem', count: 12, icon: '✉️', premium: false },
  { name: 'Código Boilerplate', description: 'Templates para programadores', count: 30, icon: '💻', premium: true },
  { name: 'LinkedIn Growth', description: 'Posts que geram engagement', count: 18, icon: '💼', premium: false },
];

export default function PromptPacks() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packs.map((pack, i) => (
          <Card key={i} className="group hover:border-primary/50 transition-all relative overflow-hidden">
            {pack.premium && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-warning text-warning-foreground"><Crown className="h-3 w-3 mr-1" />Premium</Badge>
              </div>
            )}
            <CardHeader>
              <div className="text-4xl mb-2">{pack.icon}</div>
              <CardTitle>{pack.name}</CardTitle>
              <CardDescription>{pack.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{pack.count} prompts</span>
                <Button variant={pack.premium ? 'outline' : 'default'} size="sm">
                  {pack.premium ? 'Desbloquear' : 'Ver Pack'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
