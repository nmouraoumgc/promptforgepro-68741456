-- "Executar": run a prompt in-app. Daily quota per plan, enforced server-side (edge function run-prompt
-- calls consume_prompt_run with the service role). Free 5/day, Pro 100/day, Premium 300/day, admin 1000/day.
create table if not exists public.prompt_run_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'Europe/Lisbon')::date,
  runs int not null default 0,
  primary key (user_id, day)
);
alter table public.prompt_run_usage enable row level security;
drop policy if exists "Own run usage select" on public.prompt_run_usage;
create policy "Own run usage select" on public.prompt_run_usage for select using (auth.uid() = user_id);
grant select on public.prompt_run_usage to authenticated;

create or replace function public.prompt_run_limit(_user_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select case
    when public.has_role(_user_id, 'admin'::app_role) then 1000
    when (select current_plan from public.profiles where id = _user_id) = 'premium'::plan_type then 300
    when (select current_plan from public.profiles where id = _user_id) = 'pro'::plan_type then 100
    else 5 end;
$$;

-- Atomically consume one run; returns allowed + counts. Only the service role may call it.
create or replace function public.consume_prompt_run(_user_id uuid)
returns table(allowed boolean, used int, run_limit int)
language plpgsql security definer set search_path = public as $$
declare lim int := public.prompt_run_limit(_user_id);
        d date := (now() at time zone 'Europe/Lisbon')::date;
        cur int;
begin
  insert into public.prompt_run_usage(user_id, day, runs) values (_user_id, d, 0) on conflict do nothing;
  select runs into cur from public.prompt_run_usage where user_id = _user_id and day = d for update;
  if cur >= lim then
    return query select false, cur, lim; return;
  end if;
  update public.prompt_run_usage set runs = runs + 1 where user_id = _user_id and day = d returning runs into cur;
  return query select true, cur, lim;
end $$;

-- Give back a run when the AI call failed (so errors don't eat the quota).
create or replace function public.refund_prompt_run(_user_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.prompt_run_usage set runs = greatest(runs - 1, 0)
  where user_id = _user_id and day = (now() at time zone 'Europe/Lisbon')::date;
$$;

revoke all on function public.consume_prompt_run(uuid) from public, anon, authenticated;
revoke all on function public.refund_prompt_run(uuid) from public, anon, authenticated;
revoke all on function public.prompt_run_limit(uuid) from public, anon;
grant execute on function public.consume_prompt_run(uuid), public.refund_prompt_run(uuid) to service_role;
grant execute on function public.prompt_run_limit(uuid) to authenticated, service_role;
