-- Track Creem one-time Prompt Packs purchases without overloading the legacy Paddle/Stripe identifier.
alter table public.purchases add column if not exists creem_order_id text;
create unique index if not exists purchases_creem_order_id_uidx
  on public.purchases (creem_order_id) where creem_order_id is not null;
