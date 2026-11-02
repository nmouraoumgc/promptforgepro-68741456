-- Marketing campaigns: per-user unsubscribe flag + token, and a send log that prevents duplicates.
create table public.email_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  marketing_unsubscribed boolean not null default false,
  unsubscribed_at timestamptz,
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
alter table public.email_preferences enable row level security;
create policy "own email prefs select" on public.email_preferences for select to authenticated using (user_id = auth.uid());
-- Writes only via the service role (unsubscribe endpoint / campaign tooling).

create table public.campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign text not null,            -- e.g. 'early_access_2026'
  batch text not null,               -- e.g. 'A1'
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','skipped_unsubscribed')),
  resend_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (campaign, user_id)         -- a user gets each campaign at most once, whatever the batch
);
create index campaign_sends_batch_idx on public.campaign_sends(campaign, batch, status);
alter table public.campaign_sends enable row level security;  -- no policies: service role only

-- Lazily create preference rows (and tokens) for a set of users.
create or replace function public.ensure_email_preferences(_user_ids uuid[]) returns void
language sql security definer set search_path = public as $$
  insert into public.email_preferences(user_id) select unnest(_user_ids) on conflict do nothing;
$$;
revoke all on function public.ensure_email_preferences(uuid[]) from public, anon, authenticated;
grant execute on function public.ensure_email_preferences(uuid[]) to service_role;
