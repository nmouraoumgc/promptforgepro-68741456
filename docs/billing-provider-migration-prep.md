# Payment provider migration — preparation only

Status: **NOT ENABLED**. This branch does not reopen checkout, deploy functions, migrate subscriptions, or modify production data.

## Current architecture (verified in repository)

- Vite/React frontend with Supabase Auth and database.
- Pricing: Pro €9/month, €90/year; Packs €19 one-time.
- Existing checkout flows call Paddle-oriented Supabase Edge Functions.
- Production `pre-checkout-check` has a fail-closed maintenance guard.
- Vercel routes visitors to maintenance; legal pages remain available.
- Historical Paddle webhooks and subscription entitlements must be preserved.

## Provider-neutral boundary

`src/lib/billing/provider-contract.ts` defines:
- purchase intents and sandbox/live environments;
- authenticated checkout request and provider-specific checkout result;
- a normalized event model and an adapter interface;
- a fail-closed new billing switch (false).

This is a **contract**, not a working gateway. No provider SDK, key, webhook, price ID, or URL has been configured.

## Implementation sequence after provider approval

1. Confirm provider's API docs, eligibility, country support, contract, payout and reserve terms.
2. Add a provider-specific server-side adapter, price mapping and sandbox-only configuration. Do not trust prices or user IDs supplied by browsers.
3. Create an authenticated checkout Edge Function with per-user authorization, idempotency, abuse controls, and an explicit server-side enable switch.
4. Create webhook endpoint using raw-body signature verification, replay protection, deduplication by provider/event ID, event timestamp ordering, and checked database write results.
5. Add a provider-aware subscription/transaction schema migration **after review**; do not overwrite Paddle identifiers or historical records.
6. Map verified payment events to the existing entitlement sync, ensuring legacy Paddle access continues for paid-through dates.
7. Preserve campaigns and promo logic only where the provider actually supports them; test discount abuse and cancellation flows.
8. Test sandbox: monthly, annual, packs, duplicate webhook, out-of-order webhook, failure, refund, cancellation, and entitlement expiry.
9. Audit Content Security Policy, legal pages, refund policy, checkout UI and analytics before production release.
10. Obtain explicit approval for production secrets, migrations, enabling payments, merge and deployment.

## Safety constraints

- No merge to main; no production deployment.
- No Paddle mutation or live payment attempts.
- No changes to `campaign-admin` v5 or Lovable.
- Never expose secrets, card data, or payment tokens.
- Do not assume existing stored payment methods can migrate.
- Do not remove the maintenance page until a provider is approved and live checkout is verified.
