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

-- Rate limit per server-provided fingerprint, with atomic counter updates.
create table if not exists public.payment_waitlist_rate_limits (
 fingerprint text not null,
 window_start timestamptz not null,
 attempts integer not null default 1,
 primary key (fingerprint, window_start)
);
alter table public.payment_waitlist_rate_limits enable row level security;
revoke all on public.payment_waitlist_rate_limits from anon, authenticated;
create or replace function public.submit_payment_waitlist(
 p_email text, p_language text, p_fingerprint text
) returns boolean language plpgsql security definer set search_path = public
as $$
declare v_email text := lower(btrim(p_email)); v_window timestamptz := date_trunc('hour', now()); v_count integer;
begin
 if p_fingerprint is null or length(p_fingerprint) < 32 or length(p_fingerprint) > 128 then raise exception 'INVALID_REQUEST'; end if;
 if v_email is null or length(v_email) not between 5 and 254 or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'INVALID_EMAIL'; end if;
 insert into public.payment_waitlist_rate_limits(fingerprint,window_start,attempts)
 values (p_fingerprint,v_window,1)
 on conflict (fingerprint,window_start) do update set attempts = payment_waitlist_rate_limits.attempts+1
 returning attempts into v_count;
 if v_count > 5 then return false; end if;
 insert into public.payment_reopening_waitlist(email,language,source)
 values (v_email,case when p_language='en' then 'en' else 'pt' end,'pricing')
 on conflict (email) do nothing;
 return true;
end $$;
revoke all on function public.submit_payment_waitlist(text,text,text) from public, anon, authenticated;
grant execute on function public.submit_payment_waitlist(text,text,text) to service_role;
