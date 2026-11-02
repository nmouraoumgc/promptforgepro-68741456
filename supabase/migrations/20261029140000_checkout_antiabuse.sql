-- Anti-abuse (2026-10-29):
--  * checkout_attempts: ip_hash (HMAC of the client IP, never the raw IP) and discount_code, for
--    per-IP velocity limits and once-per-account discount codes (enforced in pre-checkout-check).
--  * Disposable email blocklist enforced server-side on auth.users (signup and email change).

ALTER TABLE public.checkout_attempts
  ADD COLUMN IF NOT EXISTS ip_hash text CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$'),
  ADD COLUMN IF NOT EXISTS discount_code text CHECK (discount_code IS NULL OR discount_code ~ '^[A-Z0-9]{3,32}$');
COMMENT ON COLUMN public.checkout_attempts.status IS 'initiated | completed | failed | abandoned | blocked';
COMMENT ON COLUMN public.checkout_attempts.ip IS 'DEPRECATED: never written. Use ip_hash (HMAC-SHA256, no raw IP stored).';
COMMENT ON COLUMN public.checkout_attempts.ip_hash IS 'HMAC-SHA256 of the client IP (keyed server-side); raw IPs are never stored.';
CREATE INDEX IF NOT EXISTS idx_checkout_attempts_iphash_created ON public.checkout_attempts(ip_hash, created_at) WHERE ip_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checkout_attempts_user_code ON public.checkout_attempts(user_id, discount_code) WHERE discount_code IS NOT NULL;

-- Disposable email domains (seeded from github.com/disposable-email-domains/disposable-email-domains;
-- refresh with scripts/update_disposable_domains.mjs).
CREATE TABLE IF NOT EXISTS public.disposable_email_domains (
  domain text PRIMARY KEY CHECK (domain = lower(domain) AND domain ~ '^[a-z0-9.-]+\.[a-z0-9-]+$'),
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.disposable_email_domains ENABLE ROW LEVEL SECURITY;
-- No policies: read only through is_disposable_email().
REVOKE ALL ON public.disposable_email_domains FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_disposable_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH d AS (SELECT lower(trim(split_part(coalesce(_email, ''), '@', 2))) AS dom),
  parts AS (SELECT string_to_array(dom, '.') AS p FROM d WHERE dom <> '')
  SELECT EXISTS (
    SELECT 1 FROM parts
    CROSS JOIN LATERAL generate_series(1, greatest(array_length(parts.p, 1) - 1, 0)) AS g(i)
    JOIN public.disposable_email_domains x
      ON x.domain = array_to_string(parts.p[g.i:array_length(parts.p, 1)], '.')
  );
$$;
REVOKE ALL ON FUNCTION public.is_disposable_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_disposable_email(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.block_disposable_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND public.is_disposable_email(NEW.email) THEN
    RAISE EXCEPTION 'DISPOSABLE_EMAIL: disposable email addresses are not allowed' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.block_disposable_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS block_disposable_email_insert ON auth.users;
CREATE TRIGGER block_disposable_email_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.block_disposable_email();
DROP TRIGGER IF EXISTS block_disposable_email_update ON auth.users;
CREATE TRIGGER block_disposable_email_update
  BEFORE UPDATE OF email ON auth.users
  FOR EACH ROW WHEN (NEW.email IS DISTINCT FROM OLD.email)
  EXECUTE FUNCTION public.block_disposable_email();
