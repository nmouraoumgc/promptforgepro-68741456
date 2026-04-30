
-- 1) Trigger to keep profiles.current_plan in sync with subscriptions table.
-- This is the single source of truth for entitlement decisions in webhooks.
create or replace function public.sync_profile_plan_from_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_has_active_pro boolean;
  v_has_premium boolean;
  v_new_plan plan_type;
begin
  v_user_id := coalesce(new.user_id, old.user_id);
  if v_user_id is null then
    return coalesce(new, old);
  end if;

  -- Active Pro = any pro_monthly row that is active/trialing/past_due, OR canceled with future period_end
  select exists (
    select 1 from public.subscriptions
    where user_id = v_user_id
      and price_id = 'pro_monthly'
      and (
        (status in ('active','trialing','past_due') and (current_period_end is null or current_period_end > now()))
        or (status = 'canceled' and current_period_end is not null and current_period_end > now())
      )
  ) into v_has_active_pro;

  -- Premium = any successful one-time purchase recorded in purchases table
  select exists (
    select 1 from public.purchases
    where user_id = v_user_id
      and plan = 'premium'
      and status = 'completed'
  ) into v_has_premium;

  if v_has_premium then
    v_new_plan := 'premium';
  elsif v_has_active_pro then
    v_new_plan := 'pro';
  else
    v_new_plan := 'free';
  end if;

  update public.profiles set current_plan = v_new_plan, updated_at = now()
  where id = v_user_id and current_plan is distinct from v_new_plan;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_plan_from_subscription on public.subscriptions;
create trigger trg_sync_plan_from_subscription
  after insert or update or delete on public.subscriptions
  for each row execute function public.sync_profile_plan_from_subscription();

drop trigger if exists trg_sync_plan_from_purchase on public.purchases;
create trigger trg_sync_plan_from_purchase
  after insert or update or delete on public.purchases
  for each row execute function public.sync_profile_plan_from_subscription();

-- 2) Atomic promo redemption RPC. Enforces all server-side checks and increments current_uses.
create or replace function public.redeem_promo_code(_code text, _plan plan_type)
returns table(code text, discount_type text, discount_value numeric, duration_months integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo public.promo_codes%rowtype;
begin
  select * into v_promo from public.promo_codes
  where upper(promo_codes.code) = upper(_code)
  for update;

  if not found then raise exception 'PROMO_NOT_FOUND'; end if;
  if not v_promo.is_active then raise exception 'PROMO_INACTIVE'; end if;
  if v_promo.expires_at < now() then raise exception 'PROMO_EXPIRED'; end if;
  if v_promo.max_uses > 0 and v_promo.current_uses >= v_promo.max_uses then
    raise exception 'PROMO_LIMIT_REACHED';
  end if;
  if not (_plan::text = any(v_promo.applicable_plan_types)) then
    raise exception 'PROMO_NOT_APPLICABLE';
  end if;

  update public.promo_codes
    set current_uses = current_uses + 1, updated_at = now()
    where id = v_promo.id;

  return query select v_promo.code, v_promo.discount_type, v_promo.discount_value, v_promo.duration_months;
end;
$$;

grant execute on function public.redeem_promo_code(text, plan_type) to authenticated, service_role;
