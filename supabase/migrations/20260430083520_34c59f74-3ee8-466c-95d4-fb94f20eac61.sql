
create or replace function public.increment_promo_usage(_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.promo_codes
    set current_uses = current_uses + 1, updated_at = now()
    where upper(code) = upper(_code) and is_active = true
  returning 1 into v_updated;
  return v_updated is not null;
end;
$$;

revoke execute on function public.increment_promo_usage(text) from public, anon, authenticated;
grant execute on function public.increment_promo_usage(text) to service_role;
