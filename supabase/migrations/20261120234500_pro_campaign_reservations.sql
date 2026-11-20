-- Product Hunt Pro reservation: opt-in only, not a purchase or entitlement.
create table if not exists public.pro_campaign_reservations (
 id uuid primary key default gen_random_uuid(),
 email text not null,
 campaign text not null default 'PRODUCTHUNT20' check (campaign='PRODUCTHUNT20'),
 billing text not null check (billing in ('monthly','annual')),
 language text not null check (language in ('pt','en')),
 consent_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 status text not null default 'pending_review' check (status in ('pending_review','eligible','ineligible','notified','redeemed')),
 offer_terms jsonb not null default '{"offer":"PRODUCTHUNT20","discount_percent":20,"extension_hours":48,"activation":"pending_manual_verification","payment_collected":false}'::jsonb,
 unique(email,campaign),
 constraint normalized_email check (email=lower(btrim(email))),
 constraint email_format check (length(email) between 5 and 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
);
alter table public.pro_campaign_reservations enable row level security;
revoke all on public.pro_campaign_reservations from anon, authenticated;
create table if not exists public.pro_reservation_rate_limits (
 fingerprint text not null, window_start timestamptz not null, attempts int not null default 1,
 primary key(fingerprint,window_start)
);
alter table public.pro_reservation_rate_limits enable row level security;
revoke all on public.pro_reservation_rate_limits from anon, authenticated;
create or replace function public.submit_pro_campaign_reservation(p_email text,p_billing text,p_language text,p_fingerprint text)
returns boolean language plpgsql security definer set search_path=public as $$
declare e text:=lower(btrim(p_email)); n int;
begin
 if p_fingerprint is null or length(p_fingerprint) not between 32 and 128 then raise exception 'INVALID_FINGERPRINT'; end if;
 if e is null or length(e) not between 5 and 254 or e !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'INVALID_EMAIL'; end if;
 if p_billing not in ('monthly','annual') or p_language not in ('pt','en') then raise exception 'INVALID_OPTIONS'; end if;
 insert into public.pro_reservation_rate_limits(fingerprint,window_start,attempts)
 values(p_fingerprint,date_trunc('hour',now()),1)
 on conflict(fingerprint,window_start) do update set attempts=pro_reservation_rate_limits.attempts+1
 returning attempts into n;
 if n>5 then return false; end if;
 insert into public.pro_campaign_reservations(email,billing,language)
 values(e,p_billing,p_language)
 on conflict(email,campaign) do nothing;
 return true;
end $$;
revoke all on function public.submit_pro_campaign_reservation(text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_pro_campaign_reservation(text,text,text,text) to service_role;
