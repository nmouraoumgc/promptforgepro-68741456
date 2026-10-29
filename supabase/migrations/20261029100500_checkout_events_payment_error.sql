-- Allow checkout.payment.error (Paddle.js) in log_checkout_event.
CREATE OR REPLACE FUNCTION public.log_checkout_event(
  _event text,
  _attempt_id uuid DEFAULT NULL,
  _transaction_id text DEFAULT NULL,
  _country text DEFAULT NULL,
  _payment_method text DEFAULT NULL,
  _error text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _attempt public.checkout_attempts%ROWTYPE;
  _recent int;
  _txn text := NULLIF(lower(trim(_transaction_id)), '');
  _cc text := NULLIF(upper(trim(_country)), '');
BEGIN
  IF _event IS NULL OR _event NOT IN (
    'checkout.loaded','checkout.customer.created','checkout.customer.updated',
    'checkout.payment.selected','checkout.payment.initiated','checkout.payment.failed',
    'checkout.error','checkout.payment.error','checkout.closed','checkout.completed','checkout.warning'
  ) THEN
    RETURN false;
  END IF;

  IF _txn IS NOT NULL AND _txn !~ '^txn_[a-z0-9]{26}$' THEN _txn := NULL; END IF;
  IF _cc IS NOT NULL AND _cc !~ '^[A-Z]{2}$' THEN _cc := NULL; END IF;

  -- Simple abuse guard.
  IF _uid IS NOT NULL THEN
    SELECT count(*) INTO _recent FROM public.checkout_events
      WHERE user_id = _uid AND created_at > now() - interval '1 hour';
    IF _recent >= 300 THEN RETURN false; END IF;
  ELSE
    SELECT count(*) INTO _recent FROM public.checkout_events
      WHERE user_id IS NULL AND created_at > now() - interval '1 hour';
    IF _recent >= 2000 THEN RETURN false; END IF;
  END IF;

  -- Only link to an attempt that belongs to the caller.
  IF _attempt_id IS NOT NULL AND _uid IS NOT NULL THEN
    SELECT * INTO _attempt FROM public.checkout_attempts WHERE id = _attempt_id AND user_id = _uid;
  END IF;

  INSERT INTO public.checkout_events(user_id, attempt_id, event_name, transaction_id, country, payment_method, error)
  VALUES (_uid, _attempt.id, _event, _txn, _cc,
          left(NULLIF(trim(_payment_method), ''), 32), left(NULLIF(trim(_error), ''), 300));

  IF _attempt.id IS NOT NULL THEN
    UPDATE public.checkout_attempts SET
      paddle_transaction_id = COALESCE(paddle_transaction_id, _txn),
      country = COALESCE(_cc, country),
      -- The client can only ever mark its own still-open attempt as abandoned;
      -- completed/failed come exclusively from the signed Paddle webhook.
      status = CASE WHEN _event = 'checkout.closed' AND status = 'initiated'
                     AND NOT EXISTS (SELECT 1 FROM public.checkout_events e
                                     WHERE e.attempt_id = _attempt.id AND e.event_name = 'checkout.completed')
                   THEN 'abandoned' ELSE status END,
      updated_at = now()
    WHERE id = _attempt.id;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.log_checkout_event(text, uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_checkout_event(text, uuid, text, text, text, text) TO anon, authenticated;
