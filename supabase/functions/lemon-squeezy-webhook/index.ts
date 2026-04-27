import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[LEMONSQUEEZY-WEBHOOK] ${step}${detailsStr}`);
};

async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signature === expectedSignature;
}

async function getUserIdByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const webhookSecret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("LEMONSQUEEZY_WEBHOOK_SECRET is not set");

    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") ?? "";

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const valid = await verifySignature(rawBody, signature, webhookSecret);
    if (!valid) {
      logStep("Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const payload = JSON.parse(rawBody);
    const eventName: string = payload.meta?.event_name ?? "";
    const data = payload.data;

    logStep("Received event", { eventName });

    // ── One-time payment ──────────────────────────────────────────────────────
    if (eventName === "order_created" && data?.attributes?.status === "paid") {
      const userEmail: string = data.attributes.user_email ?? "";
      const orderId = String(data.id);
      const amountTotal: number = data.attributes.total ?? 1900;
      const currency: string = (data.attributes.currency ?? "EUR").toUpperCase();
      const customData = data.attributes.first_order_item?.custom_data ??
        data.attributes.custom_data ?? {};
      const promoId: string | null = customData.promo_id ?? null;
      const userId: string | null = customData.user_id ?? await getUserIdByEmail(supabase, userEmail);

      if (userId) {
        await supabase.from("profiles").update({ current_plan: "premium" }).eq("id", userId);
        await supabase.from("purchases").upsert(
          {
            user_id: userId,
            plan: "premium",
            amount_cents: amountTotal,
            currency,
            stripe_payment_id: orderId,
            status: "completed",
          },
          { onConflict: "stripe_payment_id" },
        );
        if (promoId) {
          await supabase.rpc("increment_promo_usage", { promo_id_param: promoId });
        }
        logStep("Order processed", { userId, orderId });
      } else {
        logStep("No user found for order", { email: userEmail, orderId });
      }
    }

    // ── Subscription activated / renewed ─────────────────────────────────────
    if (
      ["subscription_created", "subscription_updated", "subscription_resumed"].includes(eventName)
    ) {
      const subStatus: string = data?.attributes?.status ?? "";
      const userEmail: string = data?.attributes?.user_email ?? "";
      if ((subStatus === "active" || subStatus === "on_trial") && userEmail) {
        const userId = await getUserIdByEmail(supabase, userEmail);
        if (userId) {
          await supabase.from("profiles").update({ current_plan: "pro" }).eq("id", userId);
          logStep("Subscription activated", { email: userEmail });
        }
      }
    }

    // ── Subscription cancelled / expired ─────────────────────────────────────
    if (["subscription_cancelled", "subscription_expired"].includes(eventName)) {
      const userEmail: string = data?.attributes?.user_email ?? "";
      if (userEmail) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, current_plan")
          .eq("email", userEmail)
          .maybeSingle();
        if (profile?.id && profile.current_plan === "pro") {
          await supabase.from("profiles").update({ current_plan: "free" }).eq("id", profile.id);
          logStep("Subscription cancelled", { email: userEmail });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
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
