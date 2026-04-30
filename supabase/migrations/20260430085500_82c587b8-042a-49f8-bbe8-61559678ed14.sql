-- Lock down internal-only functions
REVOKE EXECUTE ON FUNCTION public.increment_promo_usage(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_plan_from_subscription() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;

-- Keep validate_promo_code callable by signed-in users (used at checkout).
REVOKE EXECUTE ON FUNCTION public.validate_promo_code(text, plan_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, plan_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated;