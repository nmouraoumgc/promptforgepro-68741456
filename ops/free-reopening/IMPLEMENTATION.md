# Free reopening and merchant review — 20 November 2026

## Approved scope
- Reopen public site, lessons, pricing and Free registration.
- Keep all new Pro and Prompt Packs checkouts disabled on BOTH client and server; retain Paddle historical subscriptions/webhooks unchanged.
- Pricing page: transparent PT/EN message "Subscriptions and purchases are temporarily unavailable while we update our payment system"; Pro/Packs CTAs replaced with non-purchasing "Notify me" signup.
- Capture explicit consent and email in a dedicated waitlist; deduplicate by normalized email; privacy disclosure, timestamp, source and language; rate limit and bot protection; do not expose list publicly.
- Confirmation email only if approved sender and sending mechanism available. Never silently subscribe Free users to marketing.
- Existing subscribers keep entitlements; no forced migration, duplicate billing or unilateral cancellation.
- Separate time-limited demo account for merchant reviewers, with no real payments or personal customer data; revoke after review.
- No affiliate/ad integration in this phase; no financial investment.
- Verify signup, confirmation, login, free feature limits, privacy/terms/refunds, Pro and Packs disabled CTAs, direct checkout URLs, server checkout blocks, error states, responsive PT/EN, robots and analytics.
- Deploy only after verification of all payment routes and production-safe waitlist storage.

## Provider responses
Dodo requires public live site; formal product form and ID/bank verification, 1–3 business days review; may prioritize after submission.
Creem requires live site, prices, privacy/terms/refunds and domain support email; review begins after payout account; no expedited review; no pre-approval.

## Production safety
The current main branch redirects all routes to maintenance. Do not simply delete redirects until payment CTA, checkout route, waitlist backend and signup are tested. Maintain server-side 503 guards, historical webhooks and customer access.
