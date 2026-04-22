import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Premium Prompt Packs - one-time payment
const PREMIUM_PRICE_ID = "price_1SkmVtR9OqsKhbCAZbO1BlCj";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const supabaseAdminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Get optional email from request body (for guest checkout)
    let guestEmail: string | null = null;
    let promoCode: string | null = null;
    try {
      const body = await req.json();
      guestEmail = body.email || null;
      promoCode = body.promoCode ? String(body.promoCode).trim().toUpperCase() : null;
    } catch {
      // No body or invalid JSON, that's ok
    }

    // Try to get authenticated user
    let userEmail: string | null = null;
    let userId: string | null = null;
    
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user?.email) {
        userEmail = data.user.email;
        userId = data.user.id;
        logStep("Authenticated user found", { userId, email: userEmail });
      }
    }

    // Use authenticated email or guest email
    const email = userEmail || guestEmail;
    if (!email) {
      throw new Error("Email is required for checkout");
    }
    logStep("Using email for checkout", { email });

    // Validate promo code (if provided)
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

      if (promoError) {
        logStep("Promo lookup error", { promoCode, error: promoError.message });
        throw new Error("Could not validate promo code");
      }

      if (!promo) {
        throw new Error("Invalid promo code");
      }
      if (!promo.is_active) {
        throw new Error("Promo code is inactive");
      }
      if (promo.max_uses > 0 && promo.current_uses >= promo.max_uses) {
        throw new Error("Promo code usage limit reached");
      }
      const expiresAt = new Date(promo.expires_at);
      if (expiresAt < new Date()) {
        throw new Error("Promo code has expired");
      }
      if (promo.discount_type === "free_days") {
        throw new Error("This promo code is only valid for Pro subscriptions");
      }
      if (!promo.applicable_plan_types?.includes("premium")) {
        throw new Error("Promo code is not valid for premium");
      }

      validPromo = promo as PromoCodeRow;
      logStep("Promo validated", { code: validPromo.code, type: validPromo.discount_type, value: validPromo.discount_value });
    }

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
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer, will create new one");
    }

    // Get origin for success/cancel URLs
    const origin = req.headers.get("origin") || "https://hkmxtamqvekycbbzoeaw.lovableproject.com";
    
    // Create one-time payment session
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (validPromo) {
      const discountType = validPromo.discount_type;
      const discountValue = Number(validPromo.discount_value);

      const coupon = await stripe.coupons.create(
        discountType === "percentage"
          ? { duration: "once", percent_off: Math.min(100, discountValue), name: `Promo ${validPromo.code}` }
          : {
              duration: "once",
              amount_off: Math.max(0, Math.round(discountValue * 100)),
              currency: "eur",
              name: `Promo ${validPromo.code}`,
            }
      );
      discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price: PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      discounts,
      metadata: {
        user_id: userId || "",
        plan: "premium",
        promo_code: validPromo?.code || "",
        promo_id: validPromo?.id || "",
      },
      payment_intent_data: {
        metadata: {
          user_id: userId || "",
          plan: "premium",
          promo_code: validPromo?.code || "",
          promo_id: validPromo?.id || "",
        },
      },
    });
    
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
