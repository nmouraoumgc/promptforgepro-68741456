-- Recompute effective rights when a historical Paddle paid-through period ends.
-- No Paddle API call, subscription mutation, charge, or premature entitlement change.
do $preflight$
begin
  if to_regprocedure('public.recompute_profile_plan(uuid)') is null then
    raise exception 'recompute_profile_plan(uuid) required';
  end if;
  if exists (select 1 from cron.job where jobname = 'expire-paddle-access') then
    raise exception 'expire-paddle-access job already exists';
  end if;
end;
$preflight$;

select cron.schedule('expire-paddle-access', '*/5 * * * *', $job$
  do $sweep$
  declare candidate uuid;
  begin
    for candidate in
      select distinct p.id from public.profiles p
      join public.subscriptions s on s.user_id = p.id
      where s.paddle_subscription_id is not null
        and s.current_period_end <= now()
        and (s.cancel_at_period_end or s.status = 'canceled')
        and p.current_plan = 'pro'::public.plan_type
      order by p.id
    loop
      perform public.recompute_profile_plan(candidate);
    end loop;
  end;
  $sweep$;
$job$);
