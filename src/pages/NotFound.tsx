import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useIsEnglish } from '@/i18n/lang';
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const isEnglish = useIsEnglish();
  const L = (pt: string, en: string) => (isEnglish ? en : pt);

  useEffect(() => {
    console.warn("404: route not found:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold">{L('Página não encontrada', 'Page not found')}</h1>
        <p className="mt-3 text-muted-foreground">
          {L('O endereço pode estar errado ou a página mudou de sítio.', 'The address may be wrong or the page has moved.')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild><Link to="/">{L('Voltar ao início', 'Back to home')}</Link></Button>
          <Button variant="outline" asChild><Link to="/pricing">{L('Ver planos', 'See plans')}</Link></Button>
          <Button variant="outline" asChild><Link to="/learn">{L('Aprender', 'Learn')}</Link></Button>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
