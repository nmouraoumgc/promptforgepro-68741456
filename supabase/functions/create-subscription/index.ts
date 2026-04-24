import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRO_PRICE_CENTS = 900; // 9€/month

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    let promoCode: string | null = null;
    try {
      const body = await req.json();
      promoCode = body.promoCode ? String(body.promoCode).trim().toUpperCase() : null;
    } catch {
      // ignore
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authentication required for subscriptions");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    if (customerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        return new Response(JSON.stringify({
          error: "Already subscribed",
          message: "Já tens uma subscrição ativa.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
    let trialPeriodDays: number | undefined;

    if (validPromo) {
      if (validPromo.discount_type === "free_days") {
        trialPeriodDays = Math.round(validPromo.discount_value);
      } else {
        const durationMonths = validPromo.duration_months ?? 0;
        const couponParams: Stripe.CouponCreateParams = {
          duration: durationMonths > 0 ? "repeating" : "once",
          name: `Promo ${validPromo.code}`,
          ...(durationMonths > 0 ? { duration_in_months: durationMonths } : {}),
        };

        if (validPromo.discount_type === "percentage") {
          couponParams.percent_off = validPromo.discount_value;
        } else {
          couponParams.amount_off = Math.round(validPromo.discount_value * 100);
          couponParams.currency = "eur";
        }

        const coupon = await stripe.coupons.create(couponParams);
        discounts.push({ coupon: coupon.id });
      }
    }

    const origin = req.headers.get("origin") || "https://hkmxtamqvekycbbzoeaw.lovableproject.com";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: PRO_PRICE_CENTS,
            recurring: { interval: "month" },
            product_data: {
              name: "Pro Subscription",
              description: "Unlimited optimizations and advanced prompt tools",
            },
          },
        },
      ],
      mode: "subscription",
      success_url: `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        user_id: user.id,
        plan: "pro",
        promo_code: validPromo?.code || "",
        promo_id: validPromo?.id || "",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: "pro",
          promo_code: validPromo?.code || "",
          promo_id: validPromo?.id || "",
        },
        ...(trialPeriodDays ? { trial_period_days: trialPeriodDays } : {}),
      },
    };

    if (discounts.length > 0) {
      sessionParams.discounts = discounts;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Stripe subscription checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url, provider: "stripe" }), {
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
