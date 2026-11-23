create role anon;
create role authenticated;
create role service_role bypassrls;
create role supabase_auth_admin;
create schema auth;
create table auth.users(id uuid primary key, email text not null);
grant usage on schema auth to supabase_auth_admin;
grant insert on auth.users to supabase_auth_admin;
create function auth.uid() returns uuid language sql as
  $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.role() returns text language sql as $$select current_user::text$$;
create table public.profiles(id uuid primary key references auth.users, email text not null,
  current_plan text not null default 'free' check (current_plan in ('free','pro','premium','packs')));
alter table public.profiles enable row level security;
create policy own_profile on public.profiles for select to authenticated using (auth.uid() = id);
grant usage on schema auth to authenticated;
grant select, update, insert on public.profiles to authenticated;
create table public.user_roles(user_id uuid, role text);
alter table public.user_roles enable row level security;
create policy own_roles on public.user_roles for select to authenticated using (auth.uid() = user_id);
create function public.qa_create_profile() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id,email) values(new.id,new.email);
  return new;
end;
$$;
create trigger qa_auth_profile_created after insert on auth.users
  for each row execute function public.qa_create_profile();
create table public.learn_lesson_content(id uuid);
create table public.learn_lessons(id uuid);
create table public.learn_progress(id uuid);
