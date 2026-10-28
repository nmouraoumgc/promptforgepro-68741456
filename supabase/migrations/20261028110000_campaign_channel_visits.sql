-- Landing tracking for public channel links without a per-recipient id, e.g.
-- /pricing?code=ONEHACK50&c=ONEHACK. Only channels listed in campaign_channels are logged.
create table if not exists public.campaign_channels (
  code text primary key check (code ~ '^[A-Z0-9_-]{2,40}$'),
  discount_code text,
  note text,
  created_at timestamptz not null default now()
);
create table if not exists public.campaign_visits (
  id bigint generated always as identity primary key,
  channel text not null references public.campaign_channels(code),
  path text,
  user_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists campaign_visits_channel_created on public.campaign_visits(channel, created_at);
alter table public.campaign_channels enable row level security;
alter table public.campaign_visits enable row level security;
-- No policies: only service role / security definer functions touch these tables.

create or replace function public.log_campaign_visit(p_channel text, p_path text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.campaign_visits(channel, path, user_id)
  select c.code, left(p_path, 200), auth.uid() from public.campaign_channels c where c.code = upper(p_channel);
$$;
revoke all on function public.log_campaign_visit(text, text) from public;
grant execute on function public.log_campaign_visit(text, text) to anon, authenticated;

insert into public.campaign_channels(code, discount_code, note)
values ('ONEHACK', 'ONEHACK50', 'onehack.st forum post, 50% off first month of Pro')
on conflict (code) do nothing;
