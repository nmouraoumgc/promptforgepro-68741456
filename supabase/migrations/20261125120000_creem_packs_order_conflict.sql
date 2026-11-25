-- ON CONFLICT (creem_order_id) requires a non-partial unique index.
-- PostgreSQL unique indexes already allow multiple NULL values, preserving legacy rows.
drop index if exists public.purchases_creem_order_id_uidx;
create unique index purchases_creem_order_id_uidx
  on public.purchases (creem_order_id);
