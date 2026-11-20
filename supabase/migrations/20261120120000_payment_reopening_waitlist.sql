-- Apply only after review in Supabase migration workflow.
create table if not exists public.payment_reopening_waitlist (
 id uuid primary key default gen_random_uuid(),
 email text not null,
 language text not null default 'pt' check (language in ('pt','en')),
 source text not null default 'pricing',
 consent_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 notified_at timestamptz,
 constraint waitlist_email_normalized check (email = lower(btrim(email))),
 constraint waitlist_email_unique unique (email),
 constraint waitlist_email_valid check (length(email) between 5 and 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
);
alter table public.payment_reopening_waitlist enable row level security;
-- Deliberately NO anon/authenticated policies: submission only via rate-limited
-- server-side Edge Function using service role, never from browser directly.
revoke all on public.payment_reopening_waitlist from anon, authenticated;
comment on table public.payment_reopening_waitlist is 'Opt-in solely for notifying about payment reopening; not marketing consent.';
