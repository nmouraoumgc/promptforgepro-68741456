import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const lsApiKey = Deno.env.get("LEMONSQUEEZY_API_KEY");
    if (!lsApiKey) throw new Error("LEMONSQUEEZY_API_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const lsResponse = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions?filter[user_email]=${encodeURIComponent(user.email)}`,
      {
        headers: {
          "Accept": "application/vnd.api+json",
          "Authorization": `Bearer ${lsApiKey}`,
        },
      },
    );

    if (!lsResponse.ok) {
      const errText = await lsResponse.text();
      logStep("Lemon Squeezy API error", { status: lsResponse.status, body: errText });
      throw new Error(`Could not retrieve subscriptions: ${lsResponse.status}`);
    }

    const lsData = await lsResponse.json();
    const subscriptions: Array<{ attributes: { status: string; renews_at?: string; ends_at?: string } }> =
      lsData?.data ?? [];

    const activeSub = subscriptions.find(
      (s) => s.attributes.status === "active" || s.attributes.status === "on_trial",
    );

    const hasActive = Boolean(activeSub);
    const subscriptionEnd = hasActive
      ? (activeSub!.attributes.renews_at || activeSub!.attributes.ends_at || null)
      : null;

    // Sync profile.current_plan for trustworthy client gating
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("current_plan")
      .eq("id", user.id)
      .single();

    if (hasActive && profile?.current_plan !== "pro" && profile?.current_plan !== "premium") {
      await supabaseClient.from("profiles").update({ current_plan: "pro" }).eq("id", user.id);
    } else if (!hasActive && profile?.current_plan === "pro") {
      await supabaseClient.from("profiles").update({ current_plan: "free" }).eq("id", user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActive,
      plan: hasActive ? "pro" : null,
      subscription_end: subscriptionEnd,
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
