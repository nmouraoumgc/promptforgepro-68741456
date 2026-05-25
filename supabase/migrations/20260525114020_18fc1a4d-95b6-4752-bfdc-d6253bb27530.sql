
-- Trial redemptions: 1 trial €2/7 dias por utilizador
CREATE TABLE public.trial_redemptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  paddle_subscription_id text,
  paddle_transaction_id text,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trial_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own trial redemption" ON public.trial_redemptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all trial redemptions" ON public.trial_redemptions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages trial redemptions" ON public.trial_redemptions
  FOR ALL USING (auth.role() = 'service_role');

-- Checkout attempts (anti-fraude / rate limiting)
CREATE TABLE public.checkout_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  ip text,
  status text NOT NULL DEFAULT 'initiated', -- initiated | completed | failed
  reason text,
  price_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checkout_attempts_user_created ON public.checkout_attempts(user_id, created_at DESC);
CREATE INDEX idx_checkout_attempts_email_created ON public.checkout_attempts(email, created_at DESC);
ALTER TABLE public.checkout_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view checkout attempts" ON public.checkout_attempts
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages checkout attempts" ON public.checkout_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- Dunning notifications (idempotência de emails de falha)
CREATE TABLE public.dunning_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL, -- initial | day3 | day6
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, reminder_type)
);
CREATE INDEX idx_dunning_user ON public.dunning_notifications(user_id);
ALTER TABLE public.dunning_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view dunning" ON public.dunning_notifications
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own dunning" ON public.dunning_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages dunning" ON public.dunning_notifications
  FOR ALL USING (auth.role() = 'service_role');
