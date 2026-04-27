import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

const PRO_MONTHLY_CENTS = 900; // 9€/month

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

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

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Reuse existing Stripe customer when possible
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // Build optional discount via Stripe Coupon
    let discounts: { coupon: string }[] | undefined = undefined;
    if (validPromo) {
      if (validPromo.discount_type === "percentage") {
        const coupon = await stripe.coupons.create({
          percent_off: validPromo.discount_value,
          duration: validPromo.duration_months && validPromo.duration_months > 0 ? "repeating" : "once",
          duration_in_months: validPromo.duration_months && validPromo.duration_months > 0 ? validPromo.duration_months : undefined,
          name: validPromo.code,
        });
        discounts = [{ coupon: coupon.id }];
      } else if (validPromo.discount_type === "fixed") {
        const coupon = await stripe.coupons.create({
          amount_off: Math.round(validPromo.discount_value * 100),
          currency: "eur",
          duration: validPromo.duration_months && validPromo.duration_months > 0 ? "repeating" : "once",
          duration_in_months: validPromo.duration_months && validPromo.duration_months > 0 ? validPromo.duration_months : undefined,
          name: validPromo.code,
        });
        discounts = [{ coupon: coupon.id }];
      }
      // free_days handled via subscription_data.trial_period_days below
    }

    const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            recurring: { interval: "month" },
            product_data: {
              name: "PromptForge Pro",
              description: "Monthly Pro subscription — unlimited optimizations, history, A/B tests",
            },
            unit_amount: PRO_MONTHLY_CENTS,
          },
          quantity: 1,
        },
      ],
      discounts,
      subscription_data: validPromo?.discount_type === "free_days" && validPromo.discount_value > 0
        ? { trial_period_days: Math.round(validPromo.discount_value) }
        : undefined,
      success_url: `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plans`,
      metadata: {
        user_id: user.id,
        plan: "pro",
        promo_id: validPromo?.id || "",
        promo_code: validPromo?.code || "",
      },
    });

    logStep("Stripe subscription session created", {
      sessionId: session.id,
      userId: user.id,
      hasPromo: Boolean(validPromo?.code),
    });

    return new Response(JSON.stringify({ url: session.url, provider: "stripe", sessionId: session.id }), {
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
