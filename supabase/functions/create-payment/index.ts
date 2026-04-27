import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

const BASE_PRICE_CENTS = 1900; // 19€
const EXTERNAL_CHECKOUT_URL =
  Deno.env.get("PREMIUM_CHECKOUT_URL") ||
  Deno.env.get("CHECKOUT_URL") ||
  Deno.env.get("ALTERNATIVE_CHECKOUT_URL");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  const supabaseAdminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    if (!EXTERNAL_CHECKOUT_URL) {
      throw new Error("External checkout is not configured. Set PREMIUM_CHECKOUT_URL or CHECKOUT_URL");
    }

    let guestEmail: string | null = null;
    let promoCode: string | null = null;

    try {
      const body = await req.json();
      guestEmail = body.email || null;
      promoCode = body.promoCode ? String(body.promoCode).trim().toUpperCase() : null;
    } catch {
      // ignore
    }

    let userEmail: string | null = null;
    let userId: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user?.email) {
        userEmail = data.user.email;
        userId = data.user.id;
      }
    }

    const email = userEmail || guestEmail;
    if (!email) throw new Error("Email is required for checkout");

    type PromoCodeRow = {
      id: string;
      code: string;
      discount_type: "percentage" | "fixed" | "free_days";
      discount_value: number;
      applicable_plan_types: string[];
      max_uses: number;
      current_uses: number;
      expires_at: string;
      is_active: boolean;
    };

    let validPromo: PromoCodeRow | null = null;

    if (promoCode) {
      const { data: promo, error: promoError } = await supabaseAdminClient
        .from("promo_codes")
        .select("id, code, discount_type, discount_value, applicable_plan_types, max_uses, current_uses, expires_at, is_active")
        .eq("code", promoCode)
        .maybeSingle();

      if (promoError) throw new Error("Could not validate promo code");
      if (!promo) throw new Error("Invalid promo code");
      if (!promo.is_active) throw new Error("Promo code is inactive");
      if (promo.max_uses > 0 && promo.current_uses >= promo.max_uses) throw new Error("Promo code usage limit reached");
      if (new Date(promo.expires_at) < new Date()) throw new Error("Promo code has expired");
      if (promo.discount_type === "free_days") throw new Error("This promo code is only valid for Pro subscriptions");
      if (!promo.applicable_plan_types?.includes("premium")) throw new Error("Promo code is not valid for premium");

      validPromo = promo as PromoCodeRow;
    }

    // Compute final price
    let finalPriceCents = BASE_PRICE_CENTS;
    if (validPromo) {
      if (validPromo.discount_type === "percentage") {
        finalPriceCents = Math.max(
          0,
          Math.round(BASE_PRICE_CENTS - (BASE_PRICE_CENTS * validPromo.discount_value) / 100),
        );
      } else if (validPromo.discount_type === "fixed") {
        finalPriceCents = Math.max(0, BASE_PRICE_CENTS - Math.round(validPromo.discount_value * 100));
      }
    }

    const checkoutUrl = new URL(EXTERNAL_CHECKOUT_URL);
    checkoutUrl.searchParams.set("email", email);
    checkoutUrl.searchParams.set("plan", "premium");
    checkoutUrl.searchParams.set("amount_cents", String(finalPriceCents));
    if (userId) checkoutUrl.searchParams.set("user_id", userId);
    if (validPromo?.id) checkoutUrl.searchParams.set("promo_id", validPromo.id);
    if (validPromo?.code) checkoutUrl.searchParams.set("promo_code", validPromo.code);

    logStep("External checkout prepared", {
      hasPromo: Boolean(validPromo?.code),
      hasUser: Boolean(userId),
      finalPriceCents,
    });

    return new Response(JSON.stringify({ url: checkoutUrl.toString(), provider: "external" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
