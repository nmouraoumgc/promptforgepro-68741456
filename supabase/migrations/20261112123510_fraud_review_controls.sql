-- Admin-maintained identifiers; no card numbers or automatic refunds.
CREATE TABLE public.fraud_blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('email','paddle_customer')),
  value text NOT NULL CHECK (length(value) BETWEEN 3 AND 254 AND value = lower(trim(value))),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 3 AND 500),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  UNIQUE(kind, value)
);
ALTER TABLE public.fraud_blocklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY fraud_blocklist_admin ON public.fraud_blocklist FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE ALL ON public.fraud_blocklist FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT(kind, value, reason), UPDATE(active) ON public.fraud_blocklist TO authenticated;
GRANT ALL ON public.fraud_blocklist TO service_role;

CREATE TABLE public.fraud_block_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  block_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created','activated','deactivated')),
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fraud_block_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY fraud_block_audit_admin ON public.fraud_block_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE ALL ON public.fraud_block_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fraud_block_audit TO authenticated;
GRANT ALL ON public.fraud_block_audit TO service_role;
CREATE FUNCTION public.audit_fraud_block() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.active IS DISTINCT FROM NEW.active THEN
    INSERT INTO public.fraud_block_audit(block_id, action, actor)
    VALUES (NEW.id, CASE WHEN TG_OP = 'INSERT' THEN 'created' WHEN NEW.active THEN 'activated' ELSE 'deactivated' END, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_fraud_block() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fraud_block_audit_trigger AFTER INSERT OR UPDATE OF active ON public.fraud_blocklist FOR EACH ROW EXECUTE FUNCTION public.audit_fraud_block();

CREATE FUNCTION public.is_checkout_buyer_blocked(_email text, _user_id uuid, _environment text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.fraud_blocklist b WHERE b.active AND (
    (b.kind = 'email' AND b.value = lower(trim(_email))) OR
    (b.kind = 'paddle_customer' AND EXISTS (SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = _user_id AND lower(s.paddle_customer_id) = b.value))));
$$;
REVOKE ALL ON FUNCTION public.is_checkout_buyer_blocked(text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_checkout_buyer_blocked(text,uuid,text) TO service_role;

CREATE TABLE public.fraud_payment_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL,
  user_id uuid NOT NULL,
  environment text NOT NULL CHECK (environment IN ('live','sandbox')),
  reason text NOT NULL CHECK (reason = 'prior_failed_payment'),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, environment, reason)
);
ALTER TABLE public.fraud_payment_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY fraud_alert_admin ON public.fraud_payment_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY fraud_alert_admin_update ON public.fraud_payment_alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE ALL ON public.fraud_payment_alerts FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE(status) ON public.fraud_payment_alerts TO authenticated;
GRANT ALL ON public.fraud_payment_alerts TO service_role;

CREATE FUNCTION public.flag_suspicious_payment(_transaction_id text, _user_id uuid, _environment text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.fraud_payment_alerts(transaction_id, user_id, environment, reason)
  SELECT _transaction_id, _user_id, _environment, 'prior_failed_payment'
  WHERE _transaction_id IS NOT NULL AND _user_id IS NOT NULL AND _environment IN ('live','sandbox')
    AND EXISTS (SELECT 1 FROM public.payment_failures f WHERE f.user_id = _user_id
      AND f.environment = _environment AND f.source = 'webhook' AND f.created_at >= now() - interval '24 hours')
  ON CONFLICT (transaction_id, environment, reason) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.flag_suspicious_payment(text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flag_suspicious_payment(text,uuid,text) TO service_role;
