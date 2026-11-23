begin;
create or replace function public.recompute_profile_plan(_user_id uuid)
returns public.plan_type
language plpgsql
security definer
set search_path = public
as $$
declare
  v_override public.plan_type;
  v_has_premium boolean;
  v_has_pro boolean;
  v_has_packs boolean;
  v_new_plan public.plan_type;
begin
  if _user_id is null then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended(_user_id::text, 3));

  select o.plan into v_override from public.plan_overrides o
  where o.user_id = _user_id and (o.expires_at is null or o.expires_at > now());

  select exists (
    select 1 from public.purchases
    where user_id = _user_id and plan = 'premium' and status = 'completed'
  ) or v_override is not distinct from 'premium'::public.plan_type into v_has_premium;

  select exists (
    select 1 from public.subscriptions
    where user_id = _user_id
      and price_id in ('pro_monthly','pro_monthly_trial_7d','pro_annual')
      and (
        (status in ('active','trialing','past_due') and (current_period_end is null or current_period_end > now()))
        or (status = 'canceled' and current_period_end is not null and current_period_end > now())
      )
  ) or v_override is not distinct from 'pro'::public.plan_type into v_has_pro;

  select exists (
    select 1 from public.purchases
    where user_id = _user_id and plan = 'packs' and status = 'completed'
  ) or v_override is not distinct from 'packs'::public.plan_type into v_has_packs;

  if v_has_premium then v_new_plan := 'premium';
  elsif v_has_pro then v_new_plan := 'pro';
  elsif v_has_packs then v_new_plan := 'packs';
  else v_new_plan := 'free';
  end if;

  update public.profiles set current_plan = v_new_plan, updated_at = now()
  where id = _user_id and current_plan is distinct from v_new_plan;

  return v_new_plan;
end;
$$;
revoke all on function public.recompute_profile_plan(uuid) from public, anon, authenticated;
grant execute on function public.recompute_profile_plan(uuid) to service_role;


commit;
