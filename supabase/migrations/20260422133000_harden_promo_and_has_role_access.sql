-- 1) Restrict promo_codes reads to authenticated users only (remove public read)
drop policy if exists "Public can read promo codes" on public.promo_codes;

create policy "Authenticated can read promo codes"
on public.promo_codes
for select
to authenticated
using (true);

-- 2) Prevent has_role() from being used to probe other users' roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when auth.uid() is null then false
      when _user_id <> auth.uid() then false
      else exists (
        select 1
        from public.user_roles
        where user_id = _user_id
          and role = _role
      )
    end
$$;

revoke all on function public.has_role(uuid, app_role) from public;
grant execute on function public.has_role(uuid, app_role) to authenticated, service_role;
