-- Anti-fraud v2 (2026-10-30):
--  * payment_failures: every failed card payment inside a checkout, reported by the browser (Paddle.js
--    checkout.payment.failed, via pre-checkout-check action=payment_failed, which adds the keyed IP hash)
--    and by the signed Paddle webhook (transaction.payment_failed, one row per Paddle payment attempt).
--    pre-checkout-check uses it to enforce 3 failures/account/24h and 5 failures/IP/24h, both before
--    opening and while a checkout is open (the client closes the overlay when told to).
--  * discount_flags: transactions charged with a discount we did not issue server-side, a reused one,
--    or a different discount than the one issued. Admins review them in the Admin dashboard.

CREATE TABLE IF NOT EXISTS public.payment_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.checkout_attempts(id) ON DELETE SET NULL,
  ip_hash text CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$'),
  transaction_id text CHECK (transaction_id IS NULL OR transaction_id ~ '^txn_[a-z0-9]{26}$'),
  source text NOT NULL CHECK (source IN ('client', 'webhook')),
  ref text CHECK (ref IS NULL OR char_length(ref) <= 80),
  error text CHECK (error IS NULL OR char_length(error) <= 200),
  environment text NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'sandbox')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_failures_source_ref ON public.payment_failures(source, ref) WHERE ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_failures_user_created ON public.payment_failures(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_failures_ip_created ON public.payment_failures(ip_hash, created_at DESC) WHERE ip_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_failures_txn ON public.payment_failures(transaction_id);
ALTER TABLE public.payment_failures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view payment failures" ON public.payment_failures;
CREATE POLICY "Admins can view payment failures" ON public.payment_failures
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Service role manages payment failures" ON public.payment_failures;
CREATE POLICY "Service role manages payment failures" ON public.payment_failures
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.payment_failures FROM anon, authenticated;
GRANT SELECT ON public.payment_failures TO authenticated; -- RLS limits to admins

CREATE TABLE IF NOT EXISTS public.discount_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  environment text NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'sandbox')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  transaction_id text NOT NULL CHECK (transaction_id ~ '^txn_[a-z0-9]{26}$'),
  subscription_id text,
  kind text NOT NULL CHECK (kind IN ('subscription', 'one_time', 'other')),
  price_external_id text,
  discount_id text,
  discount_code text,
  issued_code text,
  reason text NOT NULL CHECK (reason IN ('discount_not_issued_by_server', 'discount_already_used', 'discount_mismatch')),
  charged_minor bigint,
  currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  action_taken text NOT NULL DEFAULT 'flagged' CHECK (action_taken IN ('flagged', 'subscription_cancelled', 'access_withheld')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
  review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 500),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  UNIQUE (transaction_id, reason)
);
CREATE INDEX IF NOT EXISTS idx_discount_flags_status_created ON public.discount_flags(status, created_at DESC);
ALTER TABLE public.discount_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view discount flags" ON public.discount_flags;
CREATE POLICY "Admins can view discount flags" ON public.discount_flags
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Service role manages discount flags" ON public.discount_flags;
CREATE POLICY "Service role manages discount flags" ON public.discount_flags
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.discount_flags FROM anon, authenticated;
GRANT SELECT ON public.discount_flags TO authenticated; -- RLS limits to admins

-- Admin review: only status/note/reviewer change, through this function.
CREATE OR REPLACE FUNCTION public.admin_review_discount_flag(_id uuid, _status text, _note text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF _status NOT IN ('open', 'under_review', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;
  UPDATE public.discount_flags SET
    status = _status,
    review_note = COALESCE(left(NULLIF(trim(_note), ''), 500), review_note),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = _id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_discount_flag(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_discount_flag(uuid, text, text) TO authenticated;

-- Disposable domains seen in abuse (2026-10-30).
INSERT INTO public.disposable_email_domains(domain, source) VALUES
  ('crackone.org', 'manual'),
  ('wibucrypto.pro', 'manual')
ON CONFLICT (domain) DO UPDATE SET source = 'manual'; -- manual rows survive upstream refreshes
