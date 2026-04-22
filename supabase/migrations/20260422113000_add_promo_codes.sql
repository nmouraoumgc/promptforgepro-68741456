-- Promo codes persisted in database (shared across all users/sessions)
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed', 'free_days')),
  discount_value numeric(10,2) not null default 0 check (discount_value > 0),
  applicable_plan_types text[] not null default array['free','pro','premium']::text[],
  max_uses integer not null default 100 check (max_uses >= 0),
  current_uses integer not null default 0 check (current_uses >= 0),
  expires_at timestamptz not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promo_codes_code_idx on public.promo_codes (code);
create index if not exists promo_codes_is_active_idx on public.promo_codes (is_active);

alter table public.promo_codes enable row level security;

create policy "Public can read promo codes"
on public.promo_codes
for select
using (true);

create policy "Admins can insert promo codes"
on public.promo_codes
for insert
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update promo codes"
on public.promo_codes
for update
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete promo codes"
on public.promo_codes
for delete
using (public.has_role(auth.uid(), 'admin'));
