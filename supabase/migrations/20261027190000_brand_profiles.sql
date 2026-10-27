-- Cofre de marca / Brand Kit: per-user brand profiles injected server-side into AI generation.
-- Limits (enforced by trigger, not just UI): free 1, pro 3, premium/admin unlimited.
create table if not exists public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  tone text not null default '' check (char_length(tone) <= 500),
  audience text not null default '' check (char_length(audience) <= 500),
  offering text not null default '' check (char_length(offering) <= 800),
  keywords text[] not null default '{}' check (cardinality(keywords) <= 30),
  forbidden_words text[] not null default '{}' check (cardinality(forbidden_words) <= 30),
  language text not null default 'pt' check (language in ('pt','en')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists brand_profiles_user_idx on public.brand_profiles(user_id);
-- At most one active profile per user.
create unique index if not exists brand_profiles_one_active on public.brand_profiles(user_id) where is_active;

alter table public.brand_profiles enable row level security;
drop policy if exists "Own brand select" on public.brand_profiles;
create policy "Own brand select" on public.brand_profiles for select using (auth.uid() = user_id);
drop policy if exists "Own brand insert" on public.brand_profiles;
create policy "Own brand insert" on public.brand_profiles for insert with check (auth.uid() = user_id);
drop policy if exists "Own brand update" on public.brand_profiles;
create policy "Own brand update" on public.brand_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Own brand delete" on public.brand_profiles;
create policy "Own brand delete" on public.brand_profiles for delete using (auth.uid() = user_id);
grant select, insert, update, delete on public.brand_profiles to authenticated;

create or replace function public.brand_profile_limit(_user_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select case
    when public.has_role(_user_id, 'admin'::app_role) then 1000000
    when (select current_plan from public.profiles where id = _user_id) = 'premium'::plan_type then 1000000
    when (select current_plan from public.profiles where id = _user_id) = 'pro'::plan_type then 3
    else 1 end;
$$;
revoke all on function public.brand_profile_limit(uuid) from public, anon;
grant execute on function public.brand_profile_limit(uuid) to authenticated, service_role;

create or replace function public.enforce_brand_profile_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform pg_advisory_xact_lock(hashtext('brand_profiles:' || new.user_id::text));
  select count(*) into n from public.brand_profiles where user_id = new.user_id;
  if n >= public.brand_profile_limit(new.user_id) then
    raise exception 'BRAND_LIMIT_REACHED' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists brand_profiles_limit on public.brand_profiles;
create trigger brand_profiles_limit before insert on public.brand_profiles
  for each row execute function public.enforce_brand_profile_limit();

create or replace function public.touch_brand_profile()
returns trigger language plpgsql as $$ begin new.updated_at = now(); new.user_id = old.user_id; return new; end $$;
drop trigger if exists brand_profiles_touch on public.brand_profiles;
create trigger brand_profiles_touch before update on public.brand_profiles
  for each row execute function public.touch_brand_profile();

-- Switch the active profile atomically (null = no brand).
create or replace function public.set_active_brand_profile(_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.brand_profiles set is_active = false where user_id = auth.uid() and is_active and (_id is null or id <> _id);
  if _id is not null then
    update public.brand_profiles set is_active = true where id = _id and user_id = auth.uid();
  end if;
end $$;
revoke all on function public.set_active_brand_profile(uuid) from public, anon;
grant execute on function public.set_active_brand_profile(uuid) to authenticated;
