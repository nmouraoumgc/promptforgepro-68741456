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
    let promoId: string | null = null;
    let paymentReference: string | null = null;

    try {
      const body = await req.json();
      promoId = body?.promo_id || null;
      paymentReference = body?.payment_reference || body?.session_id || null;
    } catch {
      // optional body
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authentication required");
    }

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

    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ current_plan: "premium" })
      .eq("id", user.id);

    if (updateError) {
      throw new Error(`Could not update profile: ${updateError.message}`);
    }

    const { error: purchaseError } = await supabaseClient
      .from("purchases")
      .insert({
        user_id: user.id,
        plan: "premium",
        amount_cents: 1900,
        currency: "EUR",
        stripe_payment_id: paymentReference,
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
      provider: "paddle",
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
