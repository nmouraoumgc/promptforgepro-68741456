import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Shield, CreditCard, Sparkles, Loader2, Ticket, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { usePromoStore, type PromoCode } from "@/stores/promoStore";

const valueItems = [
  "Todos os Prompt Packs premium",
  "Hooks, scripts, estruturas e CTAs prontos",
  "Geração ilimitada dentro dos packs",
  "Atualizações futuras incluídas",
];

const BASE_PRICE = 19;

const Checkout = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuthStore();
  const { promoCodes } = usePromoStore();

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  useEffect(() => {
    if (profile?.current_plan === "premium") navigate("/packs");
  }, [profile, navigate]);

  const handleApplyPromo = () => {
    setPromoError("");
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoError("Insere um código.");
      return;
    }
    const promo = promoCodes.find((p) => p.code.toUpperCase() === code);
    if (!promo) {
      setPromoError("Código inválido.");
      return;
    }
    if (!promo.is_active) {
      setPromoError("Código inativo.");
      return;
    }
    if (new Date(promo.expires_at) < new Date()) {
      setPromoError("Código expirado.");
      return;
    }
    if (!promo.applicable_plan_types.includes("premium")) {
      setPromoError("Código não aplicável a este plano.");
      return;
    }
    setAppliedPromo(promo);
    toast({ title: "Código aplicado!", description: `${promo.code} foi aplicado com sucesso.` });
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
  };

  const computeDiscount = () => {
    if (!appliedPromo) return 0;
    if (appliedPromo.discount_type === "percentage") {
      return Math.min(BASE_PRICE, (BASE_PRICE * appliedPromo.discount_value) / 100);
    }
    if (appliedPromo.discount_type === "fixed") {
      return Math.min(BASE_PRICE, appliedPromo.discount_value);
    }
    return 0;
  };

  const discount = computeDiscount();
  const finalPrice = Math.max(0, BASE_PRICE - discount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email obrigatório",
        description: "Por favor insere o teu email para continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { email, promoCode: appliedPromo?.code },
      });
      if (error) throw new Error(error.message);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Erro no checkout",
        description: "Não foi possível iniciar o pagamento. Por favor tenta novamente.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Premium</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Desbloqueia acesso completo aos Prompt Packs
            </h1>
            <p className="text-muted-foreground">Pagamento único. Acesso imediato.</p>
          </div>

          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-foreground mb-4">O que vais desbloquear agora:</h3>
              <ul className="space-y-3">
                {valueItems.map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Price Display */}
          <div className="text-center mb-6">
            {appliedPromo && discount > 0 ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm text-muted-foreground line-through">{BASE_PRICE}€</span>
                <div className="inline-flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-primary">{finalPrice.toFixed(2)}€</span>
                  <span className="text-muted-foreground">— pagamento único</span>
                </div>
                <span className="text-xs text-primary font-medium">
                  Poupas {discount.toFixed(2)}€ com {appliedPromo.code}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{BASE_PRICE}€</span>
                <span className="text-muted-foreground">— pagamento único</span>
              </div>
            )}
          </div>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="o-teu-email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12"
                  />
                  {user && (
                    <p className="text-xs text-muted-foreground">Autenticado como {user.email}</p>
                  )}
                </div>

                {/* Promo code */}
                <div className="space-y-2">
                  <Label htmlFor="promo">
                    <span className="inline-flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      Código de promoção (opcional)
                    </span>
                  </Label>
                  {appliedPromo ? (
                    <div className="flex items-center justify-between gap-2 px-3 h-12 rounded-md border border-primary/40 bg-primary/10">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{appliedPromo.code}</span>
                        <span className="text-muted-foreground">
                          ({appliedPromo.discount_type === "percentage"
                            ? `-${appliedPromo.discount_value}%`
                            : `-${appliedPromo.discount_value}€`})
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={removePromo}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        id="promo"
                        type="text"
                        placeholder="EX: SUMMER20"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase());
                          setPromoError("");
                        }}
                        disabled={isLoading}
                        className="h-12"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleApplyPromo}
                        disabled={isLoading || !promoInput.trim()}
                        className="h-12"
                      >
                        Aplicar
                      </Button>
                    </div>
                  )}
                  {promoError && (
                    <p className="text-xs text-destructive">{promoError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A redirecionar para Stripe...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Pagar {finalPrice.toFixed(2)}€ com Stripe
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-border space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Pagamento seguro. Processado por Stripe.</span>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Sem subscrição. Sem cobranças recorrentes.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <a
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar aos planos
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Checkout;
