import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Sparkles, Zap, FileText, RefreshCw, Lightbulb, Loader2 } from "lucide-react";
import { usePlanStore } from "@/stores/planStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const PurchaseSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setPlan } = usePlanStore();
  const { fetchProfile } = useAuthStore();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || "pt").startsWith("en");
  const [isVerifying, setIsVerifying] = useState(true);
  const checklistItems = [
    { icon: Sparkles, label: isEnglish ? "Prompt Packs unlocked" : "Prompt Packs desbloqueados" },
    { icon: FileText, label: isEnglish ? "Hooks, scripts, structures and CTAs active" : "Hooks, scripts, estruturas e CTAs ativos" },
    { icon: Zap, label: isEnglish ? "Limits removed" : "Limites removidos" },
    { icon: RefreshCw, label: isEnglish ? "Future updates included" : "Atualizações futuras incluídas" },
  ];

  useEffect(() => {
    const verifyPayment = async () => {
      // Paddle webhook updates the profile server-side; just refresh.
      try {
        await fetchProfile();
      } catch (err) {
        console.error("Profile refresh error:", err);
      }
      setPlan("premium");
      setIsVerifying(false);
    };

    verifyPayment();
  }, [searchParams, setPlan, fetchProfile]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{isEnglish ? "Verifying payment..." : "A verificar pagamento..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-primary/20 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-foreground/20 mb-4"
            >
              <Check className="h-8 w-8 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-2">
              {isEnglish ? "Access unlocked 🚀" : "Acesso desbloqueado 🚀"}
            </h1>
            <p className="text-primary-foreground/90">
              {isEnglish ? "You now have full access to all Prompt Packs." : "Tens agora acesso completo a todos os Prompt Packs."}
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Visual Checklist */}
            <div className="space-y-3">
              {checklistItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{item.label}</span>
                  <Check className="h-4 w-4 text-primary ml-auto" />
                </motion.div>
              ))}
            </div>

            {/* Primary CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                className="w-full h-12 font-semibold text-base"
                onClick={() => navigate("/packs/tiktok")}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isEnglish ? "Create my first premium prompt" : "Criar o meu primeiro prompt premium"}
              </Button>
            </motion.div>

            {/* Micro-tip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-start gap-2 p-3 rounded-lg bg-muted/50"
            >
              <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{isEnglish ? "Tip:" : "Dica:"}</span> {isEnglish ? "start with the TikTok Viral Pack for quick results." : "começa pelo TikTok Viral Pack para resultados rápidos."}
              </p>
            </motion.div>
          </CardContent>
        </Card>

        {/* Secondary navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center mt-6"
        >
          <button
            onClick={() => navigate("/packs")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isEnglish ? "View all Prompt Packs →" : "Ver todos os Prompt Packs →"}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PurchaseSuccess;
