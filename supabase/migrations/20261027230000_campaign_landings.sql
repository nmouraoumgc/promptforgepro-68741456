-- Per-recipient landing tracking for campaign links (?c=<campaign>&r=<campaign_sends.id>).
alter table public.campaign_sends
  add column if not exists landed_at timestamptz,
  add column if not exists last_landed_at timestamptz,
  add column if not exists landings int not null default 0,
  add column if not exists landed_path text;

-- Callable by anyone holding the link; send ids are random UUIDs and the function only stamps timestamps.
create or replace function public.log_campaign_landing(p_campaign text, p_send uuid, p_path text default null)
returns void language sql security definer set search_path = public as $$
  update public.campaign_sends
     set landed_at = coalesce(landed_at, now()), last_landed_at = now(),
         landings = least(landings + 1, 1000), landed_path = coalesce(landed_path, left(p_path, 200))
   where id = p_send and (campaign = p_campaign or batch = p_campaign);
$$;
revoke all on function public.log_campaign_landing(text, uuid, text) from public;
grant execute on function public.log_campaign_landing(text, uuid, text) to anon, authenticated;
