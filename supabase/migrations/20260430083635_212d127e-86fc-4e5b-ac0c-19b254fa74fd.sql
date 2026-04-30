
-- Drop the redeeming version and replace with validate-only.
drop function if exists public.redeem_promo_code(text, plan_type);

create or replace function public.validate_promo_code(_code text, _plan plan_type)
returns table(code text, discount_type text, discount_value numeric, duration_months integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo public.promo_codes%rowtype;
begin
  select * into v_promo from public.promo_codes
  where upper(promo_codes.code) = upper(_code);

  if not found then raise exception 'PROMO_NOT_FOUND'; end if;
  if not v_promo.is_active then raise exception 'PROMO_INACTIVE'; end if;
  if v_promo.expires_at < now() then raise exception 'PROMO_EXPIRED'; end if;
  if v_promo.max_uses > 0 and v_promo.current_uses >= v_promo.max_uses then
    raise exception 'PROMO_LIMIT_REACHED';
  end if;
  if not (_plan::text = any(v_promo.applicable_plan_types)) then
    raise exception 'PROMO_NOT_APPLICABLE';
  end if;

  return query select v_promo.code, v_promo.discount_type, v_promo.discount_value, v_promo.duration_months;
end;
$$;

grant execute on function public.validate_promo_code(text, plan_type) to authenticated, anon, service_role;
