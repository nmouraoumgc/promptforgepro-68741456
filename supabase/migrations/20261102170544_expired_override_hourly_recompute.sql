-- REVIEW ONLY: no production application without explicit approval.
-- Add one SQL-only hourly job; do not run the sweep while applying this migration.
-- Existing recompute_profile_plan preserves subscriptions and completed purchases.
-- No emails, HTTP calls, Paddle writes, override deletion, or changes to other jobs.
do $preflight$
begin
  if to_regprocedure('public.recompute_profile_plan(uuid)') is null then
    raise exception 'Required recompute_profile_plan(uuid) is missing';
  end if;
  if exists (select 1 from cron.job where jobname = 'recompute-expired-overrides-hourly') then
    raise exception 'Job recompute-expired-overrides-hourly already exists; review instead of replacing it';
  end if;
end;
$preflight$;

select cron.schedule(
  'recompute-expired-overrides-hourly',
  '0 * * * *',
  $command$
    do $sweep$
    declare
      candidate uuid;
    begin
      -- Lock profiles in a stable order before recomputing their current rights.
      -- Select candidates only; the existing function decides the resulting plan.
      for candidate in
        select p.id
        from public.profiles p
        where p.current_plan in ('pro'::public.plan_type, 'premium'::public.plan_type, 'packs'::public.plan_type)
          and exists (
            select 1 from public.plan_overrides o
            where o.user_id = p.id
              and o.expires_at is not null
              and o.expires_at <= now()
          )
        order by p.id
        for update of p
      loop
        perform public.recompute_profile_plan(candidate);
      end loop;
    end;
    $sweep$;
  $command$
);
