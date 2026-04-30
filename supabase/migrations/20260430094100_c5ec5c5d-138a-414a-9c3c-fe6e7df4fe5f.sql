-- Restore EXECUTE permission on has_role to authenticated users.
-- This function is used inside RLS policies for profiles, user_roles, pack_prompts, etc.
-- Without EXECUTE access, all those policies fail with "permission denied for function has_role".
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- Also restore the validate_promo_code function (called from the client via RPC)
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, public.plan_type) TO authenticated, anon;

-- Keep increment_promo_usage and sync_profile_plan_from_subscription locked down
-- (those are only called by the webhook/triggers using service_role, which bypasses GRANTs).