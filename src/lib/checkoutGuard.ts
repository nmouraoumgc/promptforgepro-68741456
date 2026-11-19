import { supabase } from "@/integrations/supabase/client";

/** User-facing PT/EN text for pre-checkout-check rejection reasons. */
export function checkoutBlockMessage(reason: string | null | undefined, en: boolean): string {
  const map: Record<string, [string, string]> = {
    buyer_blocked: [
      "Não foi possível iniciar o pagamento. Contacta o apoio ao cliente.",
      "Unable to start checkout. Please contact customer support.",
    ],
    disposable_email: [
      "Emails temporários não são permitidos. Usa um email permanente.",
      "Disposable email addresses are not allowed. Please use a permanent email.",
    ],
    trial_already_used: [
      "Já usaste o período experimental nesta conta.",
      "You have already used the trial on this account.",
    ],
    too_many_attempts: [
      "Demasiadas tentativas de pagamento falhadas. Tenta novamente dentro de 24 horas.",
      "Too many failed payment attempts. Please try again in 24 hours.",
    ],
    too_many_attempts_ip: [
      "Demasiadas tentativas de pagamento a partir desta rede. Tenta novamente mais tarde.",
      "Too many payment attempts from this network. Please try again later.",
    ],
    email_not_confirmed: [
      "Confirma o teu email antes de usar um código de desconto.",
      "Please confirm your email address before using a discount code.",
    ],
    code_already_used: [
      "Este código de desconto já foi usado na tua conta.",
      "This discount code has already been used on your account.",
    ],
    invalid_code: ["Código de desconto inválido.", "Invalid discount code."],
    code_expired: ["Este código de desconto expirou.", "This discount code has expired."],
    code_limit_reached: [
      "Este código atingiu o limite de utilizações.",
      "This discount code has reached its usage limit.",
    ],
    code_not_applicable: [
      "Este código não é válido para este plano.",
      "This code is not valid for this plan.",
    ],
    checkout_unavailable: [
      "O checkout está temporariamente indisponível. Tenta novamente.",
      "Checkout is temporarily unavailable. Please try again.",
    ],
  };
  const m = reason ? map[reason] : undefined;
  if (m) return en ? m[1] : m[0];
  return en ? "Unable to proceed." : "Não foi possível prosseguir.";
}

/** Shown when the security check itself could not run (network or server error). Checkout stays closed. */
export function checkoutRetryMessage(en: boolean): { title: string; description: string } {
  return en
    ? {
        title: "We could not start the checkout",
        description: "We could not complete a security check right now. Please wait a few seconds and try again.",
      }
    : {
        title: "Não foi possível iniciar o checkout",
        description: "Não conseguimos concluir uma verificação de segurança neste momento. Aguarda alguns segundos e tenta novamente.",
      };
}

export type PreCheckoutResult =
  | { status: "allowed"; attemptId?: string; transactionId?: string }
  | { status: "blocked"; reason: string }
  | { status: "error" };

/**
 * Runs pre-checkout-check. Fails closed: anything other than an explicit
 * `allowed: true` from the server means the checkout must not open.
 */
export async function runPreCheckoutCheck(body: Record<string, unknown>): Promise<PreCheckoutResult> {
  try {
    const { data, error } = await supabase.functions.invoke("pre-checkout-check", { body });
    if (data && data.allowed === false && typeof data.reason === "string" && data.reason !== "internal_error" && data.reason !== "unauthorized") {
      return { status: "blocked", reason: data.reason };
    }
    if (error || !data || data.allowed !== true) return { status: "error" };
    return {
      status: "allowed",
      attemptId: typeof data.attemptId === "string" ? data.attemptId : undefined,
      transactionId: typeof data.transactionId === "string" ? data.transactionId : undefined,
    };
  } catch {
    return { status: "error" };
  }
}
