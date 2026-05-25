
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_plan_from_subscription() FROM PUBLIC, anon, authenticated;
-- ensure earlier revokes are in place too (idempotent)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_promo_usage(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_promo_code(text, public.plan_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, public.plan_type) TO authenticated;
