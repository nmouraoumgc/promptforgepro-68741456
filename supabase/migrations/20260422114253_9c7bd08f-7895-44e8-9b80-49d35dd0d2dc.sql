DROP POLICY IF EXISTS "Authenticated users can view active promo codes" ON public.promo_codes;

CREATE POLICY "Anyone can view active promo codes"
ON public.promo_codes
FOR SELECT
TO public
USING (
  is_active = true
  AND expires_at > now()
);