-- REVIEW-ONLY SQL PROPOSAL. DO NOT APPLY TO PRODUCTION.
-- New payment providers must not reuse or overwrite Paddle subscription IDs.
-- Run through migration review, RLS/security review and transaction tests first.
--
-- Proposed private schema prevents direct exposure via the public Data API.
-- The production migration must confirm existing schema ownership and roles.
CREATE SCHEMA IF NOT EXISTS billing_private;

CREATE TABLE IF NOT EXISTS billing_private.provider_events (
  provider text NOT NULL CHECK (provider IN ('dodo','creem','fastspring')),
  event_id text NOT NULL,
  resource_id text NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','ignored','failed')),
  PRIMARY KEY (provider, event_id)
);

CREATE TABLE IF NOT EXISTS billing_private.provider_resource_cursor (
  provider text NOT NULL CHECK (provider IN ('dodo','creem','fastspring')),
  resource_id text NOT NULL,
  last_event_id text NOT NULL,
  last_occurred_at timestamptz NOT NULL,
  PRIMARY KEY (provider, resource_id)
);

CREATE TABLE IF NOT EXISTS billing_private.provider_subscriptions (
  provider text NOT NULL CHECK (provider IN ('dodo','creem','fastspring')),
  external_subscription_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  plan_intent text NOT NULL CHECK (plan_intent IN ('pro_monthly','pro_annual')),
  status text NOT NULL,
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, external_subscription_id)
);

-- Do not grant anon/authenticated access to billing_private.
-- A server-side transactional RPC must lock resource cursor, dedupe events,
-- verify owner/price against trusted checkout mapping, apply entitlements
-- and acknowledge success ONLY after all DB writes commit.
-- Webhook signatures MUST be verified before invoking any such RPC.
