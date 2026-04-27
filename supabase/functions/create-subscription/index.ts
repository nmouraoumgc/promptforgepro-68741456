import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

const PRO_MONTHLY_CENTS = 900; // 9€/month
const EXTERNAL_PRO_CHECKOUT_URL =
  Deno.env.get("PRO_CHECKOUT_URL") ||
  Deno.env.get("CHECKOUT_URL") ||
  Deno.env.get("ALTERNATIVE_CHECKOUT_URL");
const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") || "";

const getOrigin = (req: Request) =>
  req.headers.get("origin") ||
  req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
  PUBLIC_APP_URL;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    if (!EXTERNAL_PRO_CHECKOUT_URL) {
      throw new Error("External checkout is not configured. Set PRO_CHECKOUT_URL or CHECKOUT_URL");
    }

    let promoCode: string | null = null;
    try {
      const body = await req.json();
      promoCode = body.promoCode ? String(body.promoCode).trim().toUpperCase() : null;
    } catch {
      // ignore
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authentication required for subscriptions");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

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
      duration_months: number | null;
    };

    let validPromo: PromoCodeRow | null = null;

    if (promoCode) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      const { data: promo, error: promoError } = await supabaseAdmin
        .from("promo_codes")
        .select("id, code, discount_type, discount_value, applicable_plan_types, max_uses, current_uses, expires_at, is_active, duration_months")
        .eq("code", promoCode)
        .maybeSingle();

      if (promoError) throw new Error("Could not validate promo code");
      if (!promo) throw new Error("Invalid promo code");
      if (!promo.is_active) throw new Error("Promo code is inactive");
      if (promo.max_uses > 0 && promo.current_uses >= promo.max_uses) throw new Error("Promo code usage limit reached");
      if (new Date(promo.expires_at) < new Date()) throw new Error("Promo code has expired");
      if (!promo.applicable_plan_types?.includes("pro")) throw new Error("Promo code is not valid for Pro");

      validPromo = promo as PromoCodeRow;
    }

    const checkoutUrl = new URL(EXTERNAL_PRO_CHECKOUT_URL);
    const origin = getOrigin(req);
    const reference = crypto.randomUUID();

    checkoutUrl.searchParams.set("prefill_email", user.email);
    checkoutUrl.searchParams.set("plan", "pro");
    checkoutUrl.searchParams.set("amount_cents", String(PRO_MONTHLY_CENTS));
    checkoutUrl.searchParams.set("client_reference_id", reference);
    if (origin) {
      checkoutUrl.searchParams.set("success_url", `${origin}/subscription-success?ref=${reference}`);
      checkoutUrl.searchParams.set("cancel_url", `${origin}/plans`);
    }
    if (validPromo?.code) checkoutUrl.searchParams.set("promo_code", validPromo.code);

    logStep("External subscription checkout prepared", {
      userId: user.id,
      hasPromo: Boolean(validPromo?.code),
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
