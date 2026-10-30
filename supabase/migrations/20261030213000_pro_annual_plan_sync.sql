-- Pro annual (90 EUR/year, Paddle pri_01m67br0e15t23kqzaa4m3qa78, logical price_id 'pro_annual')
-- grants the same Pro entitlement as pro_monthly.
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

  select exists (
    select 1 from public.subscriptions
    where user_id = v_user_id
      and price_id in ('pro_monthly','pro_monthly_trial_7d','pro_annual')
      and (
        (status in ('active','trialing','past_due') and (current_period_end is null or current_period_end > now()))
        or (status = 'canceled' and current_period_end is not null and current_period_end > now())
      )
  ) into v_has_active_pro;

  select exists (
    select 1 from public.purchases
    where user_id = v_user_id
      and plan = 'premium'
      and status = 'completed'
  ) into v_has_premium;

  if v_has_premium then v_new_plan := 'premium';
  elsif v_has_active_pro then v_new_plan := 'pro';
  else v_new_plan := 'free';
  end if;

  update public.profiles set current_plan = v_new_plan, updated_at = now()
  where id = v_user_id and current_plan is distinct from v_new_plan;

  return coalesce(new, old);
end;
$$;
