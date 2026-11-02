-- Entitlements change approved 2026-10-30.
--  * New one-time purchases are recorded as plan 'packs' (payments-webhook): premium Prompt Packs
--    + all Learn lessons, Free limits for everything else.
--  * 'premium' stays as the grandfathered plan with every current feature (no change to its limits).
--  * Pro (pro_monthly, pro_monthly_trial_7d, pro_annual) now also includes premium Prompt Packs.
--  * Pro + packs resolves to 'pro' (Pro already includes packs); when Pro lapses the user falls back to 'packs'.
--  * plan_overrides: manual/comp grants (grandfathered premium without a purchase row, comp Pro), respected
--    by the plan-sync trigger so it never reverts them. Service role only (RLS on, no policies).
-- Server quotas need no change: prompt_run_limit / brand_profile_limit only grant more than Free to
-- 'premium' (300 runs/day, unlimited brands) and 'pro' (100, 3); 'packs' falls through to Free (5, 1).

-- 1) Manual / comp plan grants
create table if not exists public.plan_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan public.plan_type not null,
  reason text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.plan_overrides enable row level security;
revoke all on public.plan_overrides from anon, authenticated;
grant all on public.plan_overrides to service_role;

-- 2) Single source of truth for a user's plan. Priority: premium > pro > packs > free.
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

-- 3) Plan-sync trigger (subscriptions, purchases) now delegates to recompute_profile_plan
create or replace function public.sync_profile_plan_from_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_profile_plan(coalesce(new.user_id, old.user_id));
  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform public.recompute_profile_plan(old.user_id);
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function public.sync_profile_plan_from_subscription() from public, anon, authenticated;
grant execute on function public.sync_profile_plan_from_subscription() to service_role;

drop trigger if exists trg_sync_plan_from_override on public.plan_overrides;
create trigger trg_sync_plan_from_override
after insert or update or delete on public.plan_overrides
for each row execute function public.sync_profile_plan_from_subscription();

-- 4) Grandfather: every profile on 'premium' right now without a completed premium purchase row
--    (manual grants) gets a permanent premium override so it can never be reverted.
insert into public.plan_overrides (user_id, plan, reason)
select p.id, 'premium', 'grandfathered_premium_20261030'
from public.profiles p
where p.current_plan = 'premium'
  and exists (select 1 from auth.users u where u.id = p.id)
  and not exists (select 1 from public.purchases pu where pu.user_id = p.id and pu.plan = 'premium' and pu.status = 'completed')
on conflict (user_id) do nothing;

-- 5) Entitlement helpers for RLS (caller-only, no user id argument so nothing leaks about other users)
create or replace function public.current_user_can_access_prompt_packs()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.profiles pr where pr.id = auth.uid()
            and pr.current_plan in ('pro'::public.plan_type, 'premium'::public.plan_type, 'packs'::public.plan_type))
    or public.has_role(auth.uid(), 'admin'::app_role)
  );
$$;
revoke all on function public.current_user_can_access_prompt_packs() from public;
grant execute on function public.current_user_can_access_prompt_packs() to anon, authenticated, service_role;

create or replace function public.current_user_has_learn_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.profiles pr where pr.id = auth.uid()
            and pr.current_plan in ('pro'::public.plan_type, 'premium'::public.plan_type, 'packs'::public.plan_type))
    or public.has_role(auth.uid(), 'admin'::app_role)
  );
$$;
revoke all on function public.current_user_has_learn_access() from public;
grant execute on function public.current_user_has_learn_access() to anon, authenticated, service_role;

-- 6) RLS: premium pack prompts readable by pro, premium (grandfathered), packs and admins
drop policy if exists "View free prompts or purchased premium prompts" on public.pack_prompts;
create policy "View free prompts or purchased premium prompts"
on public.pack_prompts for select
using (
  exists (select 1 from public.prompt_packs pk where pk.id = pack_prompts.pack_id and pk.is_active = true)
  and (is_free_preview = true or public.current_user_can_access_prompt_packs())
);

-- 7) RLS: all Learn lessons for pro, premium, packs and admins
drop policy if exists "Free lessons or entitled users" on public.learn_lesson_content;
create policy "Free lessons or entitled users"
on public.learn_lesson_content for select
using (
  exists (
    select 1 from public.learn_lessons l
    where l.id = learn_lesson_content.lesson_id and l.is_active = true
      and (l.is_free = true or public.current_user_has_learn_access())
  )
);
