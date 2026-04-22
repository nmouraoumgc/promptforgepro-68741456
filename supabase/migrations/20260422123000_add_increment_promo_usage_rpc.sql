create or replace function public.increment_promo_usage(promo_id_param uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.promo_codes
  set current_uses = current_uses + 1,
      updated_at = now()
  where id = promo_id_param;
end;
$$;

revoke all on function public.increment_promo_usage(uuid) from public;
grant execute on function public.increment_promo_usage(uuid) to service_role;
