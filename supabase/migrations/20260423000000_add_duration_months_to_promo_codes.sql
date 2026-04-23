alter table public.promo_codes
  add column if not exists duration_months integer;
