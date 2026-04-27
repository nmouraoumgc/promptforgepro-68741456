import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lsApiKey = Deno.env.get("LEMONSQUEEZY_API_KEY");
    if (!lsApiKey) throw new Error("LEMONSQUEEZY_API_KEY is not set");

    let orderId: string | null = null;
    try {
      const body = await req.json();
      orderId = body?.session_id || body?.order_id || null;
    } catch {
      // optional body
    }

    if (!orderId) throw new Error("session_id (order_id) is required");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authentication required");

    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    const lsResponse = await fetch(`https://api.lemonsqueezy.com/v1/orders/${orderId}`, {
      headers: {
        "Accept": "application/vnd.api+json",
        "Authorization": `Bearer ${lsApiKey}`,
      },
    });

    if (!lsResponse.ok) {
      const errText = await lsResponse.text();
      logStep("Lemon Squeezy API error", { status: lsResponse.status, body: errText });
      throw new Error(`Could not retrieve order: ${lsResponse.status}`);
    }

    const lsData = await lsResponse.json();
    const order = lsData?.data;

    if (!order) throw new Error("Order not found");

    const status = order.attributes?.status;
    if (status !== "paid") {
      logStep("Order not paid", { status });
      return new Response(JSON.stringify({ success: false, status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const amountTotal = order.attributes?.total ?? 1900;
    const currency = (order.attributes?.currency || "EUR").toUpperCase();
    const promoId =
      order.attributes?.first_order_item?.custom_data?.promo_id ||
      order.attributes?.custom_data?.promo_id ||
      null;

    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ current_plan: "premium" })
      .eq("id", user.id);

    if (updateError) throw new Error(`Could not update profile: ${updateError.message}`);

    const { error: purchaseError } = await supabaseClient
      .from("purchases")
      .insert({
        user_id: user.id,
        plan: "premium",
        amount_cents: amountTotal,
        currency,
        stripe_payment_id: String(order.id),
        status: "completed",
      });

    if (purchaseError) {
      logStep("Purchase insert warning", { error: purchaseError.message });
    }

    if (promoId) {
      const { error: promoUpdateError } = await supabaseClient.rpc("increment_promo_usage", {
        promo_id_param: promoId,
      });
      if (promoUpdateError) {
        logStep("Promo increment warning", { error: promoUpdateError.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      plan: "premium",
      provider: "lemonsqueezy",
    }), {
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
