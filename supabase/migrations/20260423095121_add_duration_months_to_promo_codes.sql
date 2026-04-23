ALTER TABLE public.promo_codes
ADD COLUMN IF NOT EXISTS duration_months integer NOT NULL DEFAULT 0;
