import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pro Plan - monthly subscription
const PRO_PRICE_ID = "price_1SkmYPR9OqsKhbCA6CBczKnP";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Parse request body for promo code
    let promoCode: string | null = null;
    try {
      const body = await req.json();
      promoCode = body.promoCode || null;
    } catch {
      // No body or invalid JSON
    }

    // User must be authenticated for subscriptions
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
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });
    logStep("Stripe initialized");

    // Check if a Stripe customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
      
      // Check if already has active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      
      if (subscriptions.data.length > 0) {
        logStep("User already has active subscription");
        return new Response(JSON.stringify({
          error: "Already subscribed",
          message: "Já tens uma subscrição ativa."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    } else {
      logStep("No existing customer, will create new one");
    }

    // Handle promo code - look up or create Stripe coupon / trial period
    const discounts: Array<{ coupon?: string; promotion_code?: string }> = [];
    let trialPeriodDays: number | undefined;
    if (promoCode) {
      logStep("Processing promo code", { promoCode });

      // Look up promo code in our database using service role
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: promoData } = await supabaseAdmin
        .from("promo_codes")
        .select("*")
        .eq("code", promoCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (promoData) {
        logStep("Promo code found in DB", { discount_type: promoData.discount_type, discount_value: promoData.discount_value, duration_months: promoData.duration_months });

        if (promoData.discount_type === "free_days") {
          // Use Stripe trial period for free days (e.g. 60 days = 2 months free)
          trialPeriodDays = Math.round(promoData.discount_value);
          logStep("Using trial period", { trialPeriodDays });
        } else {
          // Create a Stripe coupon for percentage or fixed discount
          const durationMonths: number = promoData.duration_months ?? 0;
          const couponParams: any = {
            duration: durationMonths > 0 ? "repeating" : "once",
            name: `Promo ${promoData.code}`,
            ...(durationMonths > 0 ? { duration_in_months: durationMonths } : {}),
          };

          if (promoData.discount_type === "percentage") {
            couponParams.percent_off = promoData.discount_value;
          } else if (promoData.discount_type === "fixed") {
            couponParams.amount_off = Math.round(promoData.discount_value * 100);
            couponParams.currency = "eur";
          }

          const coupon = await stripe.coupons.create(couponParams);
          logStep("Stripe coupon created", { couponId: coupon.id, duration: couponParams.duration });
          discounts.push({ coupon: coupon.id });
        }
      } else {
        logStep("Promo code not found or inactive, ignoring");
      }
    }

    // Get origin for success/cancel URLs
    const origin = req.headers.get("origin") || "https://hkmxtamqvekycbbzoeaw.lovableproject.com";
    
    // Create subscription checkout session
    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        user_id: user.id,
        plan: "pro",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: "pro",
        },
        ...(trialPeriodDays ? { trial_period_days: trialPeriodDays } : {}),
      },
    };

    if (discounts.length > 0) {
      sessionParams.discounts = discounts;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
