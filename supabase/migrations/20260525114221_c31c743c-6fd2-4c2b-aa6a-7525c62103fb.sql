
CREATE OR REPLACE FUNCTION public.sync_profile_plan_from_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      and price_id in ('pro_monthly','pro_monthly_trial_7d')
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
$function$;
