import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Zap, History, TestTube, BarChart3, Download, Loader2 } from "lucide-react";
import { usePlanStore } from "@/stores/planStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setPlan } = usePlanStore();
  const { fetchProfile } = useAuthStore();
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === "en";
  const [isVerifying, setIsVerifying] = useState(true);
  const checklistItems = [
    { icon: Zap, label: isEnglish ? "Unlimited optimizations active" : "Otimizações ilimitadas ativas" },
    { icon: History, label: isEnglish ? "Version history unlocked" : "Histórico de versões desbloqueado" },
    { icon: TestTube, label: isEnglish ? "A/B tests available" : "Testes A/B disponíveis" },
    { icon: BarChart3, label: isEnglish ? "Detailed scoring active" : "Pontuação detalhada ativa" },
    { icon: Download, label: isEnglish ? "Prompt export available" : "Exportação de prompts disponível" },
  ];

  useEffect(() => {
    const verifySubscription = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (sessionId) {
        try {
          // Check subscription status
          const { data, error } = await supabase.functions.invoke("check-subscription");

          if (error) {
            console.error("Verification error:", error);
          } else if (data?.subscribed) {
            console.log("Subscription verified:", data);
            // Refresh profile to get updated plan
            await fetchProfile();
          }
        } catch (error) {
          console.error("Error verifying subscription:", error);
        }
      }

      // Set plan locally
      setPlan("pro");
      setIsVerifying(false);
    };

    verifySubscription();
  }, [searchParams, setPlan, fetchProfile]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{isEnglish ? "Verifying subscription..." : "A verificar subscrição..."}</p>
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
              <Zap className="h-8 w-8 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-2">
              {isEnglish ? "Welcome to Pro! ⚡" : "Bem-vindo ao Pro! ⚡"}
            </h1>
            <p className="text-primary-foreground/90">
              {isEnglish ? "Your subscription is now active." : "A tua subscrição está agora ativa."}
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
              transition={{ delay: 0.8 }}
            >
              <Button
                className="w-full h-12 font-semibold text-base"
                onClick={() => navigate("/optimizer")}
              >
                <Zap className="h-4 w-4 mr-2" />
                {isEnglish ? "Start optimizing prompts" : "Começar a otimizar prompts"}
              </Button>
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
            onClick={() => navigate("/plans")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isEnglish ? "Manage my subscription →" : "Gerir a minha subscrição →"}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SubscriptionSuccess;
