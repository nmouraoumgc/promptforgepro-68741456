import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Shield, CreditCard, Sparkles, Loader2, Ticket, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { useTranslation } from "react-i18next";
import { getCampaignCode } from "@/lib/campaignCode";
import { track } from "@/lib/analytics";

const BASE_PRICE = 19;

type AppliedPromo = {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
};

const Checkout = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState("");
  const navigate = useNavigate();
  // Stored campaign code (e.g. WELCOME100, Pro monthly only): shown as a hint, never applied to Premium.
  const [campaignCode] = useState(() => getCampaignCode());
  const { toast } = useToast();
  const { user, profile, isLoading: authLoading } = useAuthStore();
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || "pt").startsWith("en");
  const valueItems = isEnglish
    ? [
        "All premium Prompt Packs",
        "Ready-to-use hooks, scripts, structures and CTAs",
        "Unlimited generation inside packs",
        "Future updates included",
      ]
    : [
        "Todos os Prompt Packs premium",
        "Hooks, scripts, estruturas e CTAs prontos",
        "Geração ilimitada dentro dos packs",
        "Atualizações futuras incluídas",
      ];

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  useEffect(() => {
    if (profile?.current_plan === "premium") navigate("/packs");
  }, [profile, navigate]);

  // Force authentication before checkout. Without a logged-in user, the webhook
  // cannot link the purchase to an account and the user would lose access.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=${encodeURIComponent('/checkout')}`, { replace: true });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleApplyPromo = async () => {
    setPromoError("");
    const code = promoInput.trim().toUpperCase();

    if (!code) {
      setPromoError(isEnglish ? "Enter a code." : "Insere um código.");
      return;
    }

    const { data, error } = await supabase.rpc('validate_promo_code', {
      _code: code,
      _plan: 'premium',
    });

    if (error) {
      const msg = error.message || '';
      const map: Record<string, string> = {
        PROMO_NOT_FOUND: isEnglish ? 'Invalid code.' : 'Código inválido.',
        PROMO_INACTIVE: isEnglish ? 'Inactive code.' : 'Código inativo.',
        PROMO_EXPIRED: isEnglish ? 'Expired code.' : 'Código expirado.',
        PROMO_LIMIT_REACHED: isEnglish ? 'Code usage limit reached.' : 'Código atingiu o limite de utilizações.',
        PROMO_NOT_APPLICABLE: isEnglish ? 'Code not valid for Premium.' : 'Código não válido para Premium.',
      };
      const key = Object.keys(map).find((k) => msg.includes(k));
      setPromoError(key ? map[key] : (isEnglish ? 'Could not verify the code.' : 'Não foi possível verificar o código.'));
      return;
    }

    const promo = (data as any[])?.[0];
    if (!promo) {
      setPromoError(isEnglish ? 'Invalid code.' : 'Código inválido.');
      return;
    }

    setAppliedPromo({
      code: promo.code,
      discount_type: promo.discount_type as 'percentage' | 'fixed',
      discount_value: Number(promo.discount_value),
    });
    toast({
      title: isEnglish ? "Code applied!" : "Código aplicado!",
      description: isEnglish ? `${promo.code} was applied successfully.` : `${promo.code} foi aplicado com sucesso.`,
    });
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
        title: isEnglish ? "Email required" : "Email obrigatório",
        description: isEnglish ? "Please enter your email to continue." : "Por favor insere o teu email para continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { initializePaddle, getPaddlePriceId, getPaddleEnvironment, setCheckoutAttemptId } = await import("@/lib/paddle");
      const { runPreCheckoutCheck, checkoutBlockMessage, checkoutRetryMessage } = await import("@/lib/checkoutGuard");
      // Same server-side gate as the Pro subscription: disposable email, account/IP failure and attempt
      // limits, and discount codes validated server-side (confirmed email, once per account) with the
      // Paddle transaction created there. Fails closed: checkout opens only on an explicit allowed=true.
      const code = (appliedPromo?.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const check = await runPreCheckoutCheck({
        intent: "premium",
        environment: getPaddleEnvironment(),
        ...(code ? { discountCode: code } : {}),
      });
      if (check.status === "blocked") {
        toast({
          title: isEnglish ? "Checkout blocked" : "Checkout bloqueado",
          description: checkoutBlockMessage(check.reason, isEnglish),
          variant: "destructive",
        });
        return;
      }
      if (check.status === "error" || (code && !check.transactionId)) {
        toast({ ...checkoutRetryMessage(isEnglish), variant: "destructive" });
        return;
      }

      await initializePaddle();
      setCheckoutAttemptId(check.attemptId);
      const settings = {
        displayMode: "overlay",
        successUrl: `${window.location.origin}/purchase-success`,
        allowLogout: false,
        variant: "one-page",
      };
      if (check.transactionId) {
        // Discount flow: transaction (price + discount + customer + customData) created server-side.
        window.Paddle.Checkout.open({ transactionId: check.transactionId, settings });
      } else {
        const paddlePriceId = await getPaddlePriceId("premium_one_time");
        window.Paddle.Checkout.open({
          items: [{ priceId: paddlePriceId, quantity: 1 }],
          customer: { email: user.email ?? email },
          customData: { userId: user.id, ...(check.attemptId ? { attemptId: check.attemptId } : {}) },
          settings,
        });
      }
      track("checkout_opened", { plan: "premium_one_time", has_campaign_code: !!code, ...(code ? { campaign_code: code } : {}) });
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: isEnglish ? "Checkout error" : "Erro no checkout",
        description: isEnglish ? "Could not start the payment. Please try again." : "Não foi possível iniciar o pagamento. Por favor tenta novamente.",
        variant: "destructive",
      });
    } finally {
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
              {isEnglish ? "Unlock full access to Prompt Packs" : "Desbloqueia acesso completo aos Prompt Packs"}
            </h1>
            <p className="text-muted-foreground">{isEnglish ? "One-time payment. Instant access." : "Pagamento único. Acesso imediato."}</p>
          </div>

          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-foreground mb-4">{isEnglish ? "What you'll unlock now:" : "O que vais desbloquear agora:"}</h3>
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
                  <span className="text-muted-foreground">{isEnglish ? "one-time payment" : "pagamento único"}</span>
                </div>
                <span className="text-xs text-primary font-medium">
                  {isEnglish ? `You save ${discount.toFixed(2)}€ with ${appliedPromo.code}` : `Poupas ${discount.toFixed(2)}€ com ${appliedPromo.code}`}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{BASE_PRICE}€</span>
                <span className="text-muted-foreground">{isEnglish ? "one-time payment" : "pagamento único"}</span>
              </div>
            )}
          </div>

          {campaignCode && (
            <div className="mb-4 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
              {isEnglish ? <>Your code <strong>{campaignCode}</strong> is for the Pro monthly plan, not this one-time purchase. </> : <>O teu código <strong>{campaignCode}</strong> é para o plano Pro mensal, não para esta compra única. </>}
              <Link to="/pricing" className="text-primary underline font-medium">{isEnglish ? 'Use it on Pricing' : 'Usar nos Preços'}</Link>
            </div>
          )}

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email ?? ''}
                    readOnly
                    disabled
                    className="h-12 bg-muted/40 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    {isEnglish ? `Invoice will be issued to ${user.email}` : `A fatura será emitida para ${user.email}`}
                  </p>
                </div>

                {/* Promo code */}
                <div className="space-y-2">
                  <Label htmlFor="promo">
                    <span className="inline-flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      {isEnglish ? "Promo code (optional)" : "Código de promoção (opcional)"}
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
                        {isEnglish ? "Apply" : "Aplicar"}
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
                      {isEnglish ? "Redirecting to secure checkout..." : "A redirecionar para checkout seguro..."}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {isEnglish ? `Pay ${finalPrice.toFixed(2)}€ securely` : `Pagar ${finalPrice.toFixed(2)}€ em segurança`}
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-border space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>{isEnglish ? "Secure external payment processing." : "Processamento de pagamento externo e seguro."}</span>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {isEnglish ? "No subscription. No recurring charges." : "Sem subscrição. Sem cobranças recorrentes."}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <a
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isEnglish ? "← Back to pricing" : "← Voltar aos planos"}
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Checkout;
