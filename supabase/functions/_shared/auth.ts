// Shared authentication helper for edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface AuthResult {
  userId: string;
  email: string | null;
  /** Paid tools tier (Pro, grandfathered Premium, admin). NOT granted by the one-time 'packs' plan. */
  isPremium: boolean;
  /** Premium Prompt Packs access: Pro, grandfathered Premium, Prompt Packs ('packs') or admin. */
  canAccessPacks: boolean;
  isAdmin: boolean;
}

/**
 * Validates the Authorization header JWT and resolves the user's plan/role server-side.
 * Returns either an AuthResult (success) or a Response (401/403) to return immediately.
 */
export async function authenticateRequest(req: Request): Promise<AuthResult | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Não autenticado / Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData?.user) {
    return new Response(
      JSON.stringify({ error: "Não autenticado / Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = userData.user.id;

  // Resolve plan + admin role using service role (bypass RLS for trusted server lookup)
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);

  const [profileResult, rolesResult, overrideResult] = await Promise.all([
    adminClient.from("profiles").select("current_plan").eq("id", userId).maybeSingle(),
    adminClient.from("user_roles").select("role").eq("user_id", userId),
    adminClient.from("plan_overrides").select("plan, expires_at").eq("user_id", userId).maybeSingle(),
  ]);

  // An unavailable entitlement source must not silently turn a comp Pro into Free.
  if (profileResult.error || rolesResult.error || overrideResult.error) {
    return new Response(JSON.stringify({ error: "Não foi possível verificar os direitos. / Could not verify entitlements." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const profile = profileResult.data;
  const roles = rolesResult.data;
  const override = overrideResult.data;
  const overrideActive = !!override && (override.expires_at === null || Date.parse(override.expires_at) > Date.now());
  const overridePlan = overrideActive ? override.plan : null;
  let plan = profile?.current_plan ?? "free";
  // The existing override trigger copies the effective plan into profiles.
  // Time passing does not run that trigger: an expired grant can leave a
  // stale Pro/Premium/Packs cache. Resolve surviving paid rights instead of
  // treating that cached value as a second, permanent grant.
  if (override && !overrideActive) {
    const [subscriptions, purchases] = await Promise.all([
      adminClient.from("subscriptions").select("price_id, status, current_period_end").eq("user_id", userId),
      adminClient.from("purchases").select("plan, status").eq("user_id", userId),
    ]);
    if (subscriptions.error || purchases.error) {
      return new Response(JSON.stringify({ error: "Não foi possível verificar os direitos. / Could not verify entitlements." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const now = Date.now();
    const paid = (purchases.data ?? []) as { plan: string; status: string }[];
    const hasPurchase = (paidPlan: string) => paid.some(p => p.plan === paidPlan && p.status === "completed");
    const hasProSubscription = (subscriptions.data ?? []).some((s: { price_id: string; status: string; current_period_end: string | null }) => {
      if (!["pro_monthly", "pro_monthly_trial_7d", "pro_annual"].includes(s.price_id)) return false;
      const futureEnd = s.current_period_end !== null && Date.parse(s.current_period_end) > now;
      return (["active", "trialing", "past_due"].includes(s.status) && (s.current_period_end === null || futureEnd))
        || (s.status === "canceled" && futureEnd);
    });
    plan = hasPurchase("premium") ? "premium" : hasProSubscription ? "pro" : hasPurchase("packs") ? "packs" : "free";
  }
  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
  const isPremium = isAdmin || plan === "pro" || plan === "premium" || overridePlan === "pro" || overridePlan === "premium";
  const canAccessPacks = isPremium || plan === "packs" || overridePlan === "packs";

  return {
    userId,
    email: userData.user.email ?? null,
    isPremium,
    canAccessPacks,
    isAdmin,
  };
}
