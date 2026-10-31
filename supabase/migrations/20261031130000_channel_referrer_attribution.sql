-- Channel attribution by referrer host. The OneHack post links to plain https://promptforgepro.me and /signup
-- (no ?c=), so visits were never logged. Discourse sends Referrer-Policy strict-origin-when-cross-origin,
-- so document.referrer is https://onehack.st/ and is mapped to the channel server-side.
alter table public.campaign_channels add column if not exists referrer_hosts text[] not null default '{}';
update public.campaign_channels set referrer_hosts = array['onehack.st'] where code = 'ONEHACK';

alter table public.campaign_visits add column if not exists source text not null default 'link'
  check (source in ('link', 'referrer'));
alter table public.campaign_visits add column if not exists referrer_host text;

-- First-touch channel on the profile (not client-updatable: authenticated only has UPDATE on display_name).
alter table public.profiles add column if not exists signup_channel text references public.campaign_channels(code);
alter table public.profiles add column if not exists signup_channel_source text
  check (signup_channel_source in ('link', 'referrer', 'backfill_discount'));
alter table public.profiles add column if not exists signup_channel_at timestamptz;

create or replace function public.campaign_channel_for_host(p_host text)
returns text language sql stable security definer set search_path = public as $$
  select c.code from public.campaign_channels c, unnest(c.referrer_hosts) h
   where lower(regexp_replace(coalesce(p_host, ''), '^www\.', '')) = h
      or lower(coalesce(p_host, '')) like '%.' || h
   order by c.code limit 1;
$$;
revoke all on function public.campaign_channel_for_host(text) from public;

-- Referrer visit: logs one row when the host maps to a channel and returns the channel (null otherwise).
create or replace function public.log_referrer_visit(p_host text, p_path text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_ch text;
begin
  v_ch := public.campaign_channel_for_host(left(p_host, 255));
  if v_ch is null then return null; end if;
  insert into public.campaign_visits(channel, path, user_id, source, referrer_host)
  values (v_ch, left(p_path, 200), auth.uid(), 'referrer', lower(left(p_host, 255)));
  return v_ch;
end $$;
revoke all on function public.log_referrer_visit(text, text) from public;
grant execute on function public.log_referrer_visit(text, text) to anon, authenticated;

-- Stores the first-touch channel on the caller's profile; never overwrites an existing value.
create or replace function public.set_signup_channel(p_channel text, p_source text default 'link')
returns void language sql security definer set search_path = public as $$
  update public.profiles p
     set signup_channel = c.code,
         signup_channel_source = case when p_source in ('link', 'referrer') then p_source else 'link' end,
         signup_channel_at = now()
    from public.campaign_channels c
   where p.id = auth.uid() and p.signup_channel is null and c.code = upper(p_channel);
$$;
revoke all on function public.set_signup_channel(text, text) from public;
grant execute on function public.set_signup_channel(text, text) to authenticated;

-- Backfill: profiles that started a checkout with the channel's discount code (checkout_attempts.discount_code).
update public.profiles p
   set signup_channel = c.code, signup_channel_source = 'backfill_discount', signup_channel_at = now()
  from public.campaign_channels c
 where p.signup_channel is null and c.discount_code is not null
   and exists (select 1 from public.checkout_attempts a where a.user_id = p.id and a.discount_code = c.discount_code);
