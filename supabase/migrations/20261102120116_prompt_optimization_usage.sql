-- UNAPPLIED review draft, updated 2/11/2026: Free/Packs 3 per prompt AND 20/account/Lisbon day.
-- No Supabase test environment: review first; production application requires explicit approval.
-- Local SQL tests use PGlite. Only successful operations count.
create table public.prompt_optimization_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  successes integer not null default 0 check (successes >= 0),
  primary key (user_id, day)
);
create table public.prompt_optimization_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_hash text not null check (prompt_hash ~ '^[0-9a-f]{64}$'),
  successes integer not null default 0 check (successes >= 0),
  pending_token uuid,
  pending_until timestamptz,
  pending_day date,
  primary key (user_id, prompt_hash),
  check ((pending_token is null and pending_until is null and pending_day is null)
    or (pending_token is not null and pending_until is not null and pending_day is not null))
);
alter table public.prompt_optimization_usage enable row level security;
alter table public.prompt_optimization_daily_usage enable row level security;
revoke all on public.prompt_optimization_usage, public.prompt_optimization_daily_usage from public, anon, authenticated;
grant select on public.prompt_optimization_usage, public.prompt_optimization_daily_usage to authenticated;
grant select, insert, update, delete on public.prompt_optimization_usage, public.prompt_optimization_daily_usage to service_role;
create policy "Read own optimization usage" on public.prompt_optimization_usage
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Read own daily optimization usage" on public.prompt_optimization_daily_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- Only service_role can reserve. The Edge Function supplies auth.isPremium, including active overrides.
-- SQL applies numeric limits only: it does NOT resolve plans, roles or overrides.
-- Lock order in BOTH functions: account/day first, then prompt. Locks end before provider calls.
create function public.reserve_prompt_optimization(_user_id uuid, _prompt_hash text, _is_premium boolean)
returns table(allowed boolean, used integer, optimization_limit integer, token uuid, reason text,
  daily_used integer, daily_limit integer, quota_day date, resets_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
declare
  lim integer;
  daily_lim integer;
  day_used integer;
  reserved integer;
  d date := (clock_timestamp() at time zone 'Europe/Lisbon')::date;
  reset_time timestamptz := ((d + 1)::timestamp at time zone 'Europe/Lisbon');
  cur public.prompt_optimization_usage%rowtype;
  lease uuid;
begin
  if _prompt_hash is null or _prompt_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid prompt hash'; end if;
  if _is_premium is null then raise exception 'Resolved entitlement is required'; end if;
  lim := case when _is_premium then null::integer else 3 end;
  daily_lim := case when lim is null then null::integer else 20 end;
  insert into public.prompt_optimization_daily_usage(user_id,day) values (_user_id,d) on conflict do nothing;
  select successes into day_used from public.prompt_optimization_daily_usage where user_id = _user_id and day = d for update;
  insert into public.prompt_optimization_usage(user_id,prompt_hash) values (_user_id,_prompt_hash) on conflict do nothing;
  select * into cur from public.prompt_optimization_usage where user_id = _user_id and prompt_hash = _prompt_hash for update;
  if lim is not null and cur.successes >= lim then
    return query select false,cur.successes,lim,null::uuid,'LIMIT'::text,day_used,daily_lim,d,reset_time; return;
  end if;
  if cur.pending_until > clock_timestamp() then
    return query select false,cur.successes,lim,null::uuid,'BUSY'::text,day_used,daily_lim,d,reset_time; return;
  end if;
  if daily_lim is not null then
    -- Every reservation/finalization for this account/day holds the same row lock.
    select count(*)::integer into reserved from public.prompt_optimization_usage
      where user_id = _user_id and pending_day = d and pending_until > clock_timestamp();
    if day_used + reserved >= daily_lim then
      return query select false,cur.successes,lim,null::uuid,
        case when day_used >= daily_lim then 'DAILY_LIMIT'::text else 'DAILY_BUSY'::text end,day_used,daily_lim,d,reset_time; return;
    end if;
  end if;
  lease := gen_random_uuid();
  update public.prompt_optimization_usage set pending_token = lease, pending_until = clock_timestamp() + interval '2 minutes',pending_day = d
    where user_id = _user_id and prompt_hash = _prompt_hash;
  return query select true,cur.successes,lim,lease,null::text,day_used,daily_lim,d,reset_time;
end $$;

create function public.finish_prompt_optimization(_user_id uuid, _prompt_hash text, _token uuid, _success boolean)
returns table(committed boolean, used integer, daily_used integer, quota_day date)
language plpgsql security invoker set search_path = '' as $$
declare
  cur public.prompt_optimization_usage%rowtype;
  d date;
  day_used integer;
begin
  -- Read day without locking first, then acquire locks in reservation order.
  select pending_day into d from public.prompt_optimization_usage where user_id = _user_id and prompt_hash = _prompt_hash;
  if d is null then return query select false,0,0,null::date; return; end if;
  select successes into day_used from public.prompt_optimization_daily_usage where user_id = _user_id and day = d for update;
  select * into cur from public.prompt_optimization_usage where user_id = _user_id and prompt_hash = _prompt_hash for update;
  if not found or _token is null or cur.pending_token is distinct from _token
      or cur.pending_day is distinct from d or cur.pending_until <= clock_timestamp() then
    return query select false,coalesce(cur.successes,0),coalesce(day_used,0),d; return;
  end if;
  update public.prompt_optimization_usage set successes = successes + case when _success then 1 else 0 end,
    pending_token = null,pending_until = null,pending_day = null
    where user_id = _user_id and prompt_hash = _prompt_hash returning successes into cur.successes;
  if _success then
    update public.prompt_optimization_daily_usage set successes = successes + 1
      where user_id = _user_id and day = d returning successes into day_used;
  end if;
  return query select true,cur.successes,day_used,d;
end $$;
revoke all on function public.reserve_prompt_optimization(uuid,text,boolean), public.finish_prompt_optimization(uuid,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.reserve_prompt_optimization(uuid,text,boolean), public.finish_prompt_optimization(uuid,text,uuid,boolean) to service_role;
