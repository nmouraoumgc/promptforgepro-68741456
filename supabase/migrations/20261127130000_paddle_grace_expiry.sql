-- Paddle transition: end historical Paddle access 48 hours after current_period_end.
-- Context: the Paddle seller account closed on 19/11/2026 and Paddle confirmed in writing (24/11)
-- that these subscriptions pause at the next renewal without any charge. No webhook will ever
-- update these rows again, so profiles.current_plan would otherwise stay 'pro' forever.
--
-- Additive only: one audit table, one function, one pg_cron job. No Paddle call, no charge,
-- no email, no override change. Applying this migration does NOT run the sweep.
--
-- Rights: only Paddle rows (paddle_subscription_id set, creem_subscription_id null) with status
-- active/trialing/paused/past_due whose current_period_end + 48h has passed become 'expired'
-- (same terminal status as the Creem expiry job). The existing subscriptions trigger and an
-- explicit recompute_profile_plan() call then decide the effective plan, so active
-- plan_overrides, Creem subscriptions and completed purchases keep their rights.
-- Idempotent: an expired row no longer matches, so re-runs change nothing.
--
-- Rollback (manual, needs approval):
--   select cron.unschedule('expire-paddle-grace');
--   update public.subscriptions s set status = a.previous_status, updated_at = now()
--     from public.paddle_grace_expirations a
--    where a.subscription_id = s.id and s.status = 'expired' and a.rolled_back_at is null;
--   update public.paddle_grace_expirations set rolled_back_at = now() where rolled_back_at is null;
--   -- the subscriptions trigger recomputes each profile again.
--   -- optional full removal: drop function public.expire_paddle_grace(uuid); drop table public.paddle_grace_expirations;
do $preflight$
begin
  if to_regprocedure('public.recompute_profile_plan(uuid)') is null then
    raise exception 'Required recompute_profile_plan(uuid) is missing';
  end if;
  if exists (select 1 from cron.job where jobname = 'expire-paddle-grace') then
    raise exception 'Job expire-paddle-grace already exists; review instead of replacing it';
  end if;
end;
$preflight$;

create table if not exists public.paddle_grace_expirations (
  subscription_id uuid primary key,
  user_id uuid not null,
  previous_status text not null,
  current_period_end timestamptz not null,
  expired_at timestamptz not null default now(),
  rolled_back_at timestamptz
);
alter table public.paddle_grace_expirations enable row level security;  -- no policies: service role only
revoke all on public.paddle_grace_expirations from public, anon, authenticated;
grant all on public.paddle_grace_expirations to service_role;

-- p_user null = sweep everyone (cron); p_user set = only that user (creem-checkout calls it right
-- before reserving a Creem checkout, so the <=15 min gap between grace end and the cron run never
-- blocks a purchase with 'already_subscribed').
create or replace function public.expire_paddle_grace(p_user uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select s.id, s.user_id, s.status, s.current_period_end
    from public.subscriptions s
    where s.paddle_subscription_id is not null
      and s.creem_subscription_id is null
      and s.status in ('active','trialing','paused','past_due')
      and s.current_period_end is not null
      and s.current_period_end + interval '48 hours' <= now()
      and (p_user is null or s.user_id = p_user)
    order by s.user_id, s.id
    for update of s
  loop
    insert into public.paddle_grace_expirations(subscription_id, user_id, previous_status, current_period_end)
      values (r.id, r.user_id, r.status, r.current_period_end)
      on conflict (subscription_id) do update
        set previous_status = excluded.previous_status, expired_at = now(), rolled_back_at = null;
    update public.subscriptions set status = 'expired', updated_at = now() where id = r.id;
    -- The subscriptions trigger already recomputes; the explicit call keeps this correct even
    -- where the trigger is missing. recompute_profile_plan honours active plan_overrides.
    perform public.recompute_profile_plan(r.user_id);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.expire_paddle_grace(uuid) from public, anon, authenticated;
grant execute on function public.expire_paddle_grace(uuid) to service_role;

select cron.schedule('expire-paddle-grace', '*/15 * * * *', $job$select public.expire_paddle_grace(null);$job$);
