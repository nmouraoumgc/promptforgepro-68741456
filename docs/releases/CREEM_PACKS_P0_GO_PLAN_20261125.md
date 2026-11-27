# Creem Packs P0 — publication and recovery gate (25 Nov 2026)

## Verified preflight

Production `cwrxbxxfaemcvliasycz`, read-only, 25 Nov 2026:
- `purchases`: 0 rows, 0 `creem_order_id`, 0 completed Packs; no duplicate order IDs.
- `creem_checkouts` joined to `checkout_attempts`: only three Live Pro attempts (one failed annual, one initiated annual, one initiated monthly); no Packs attempt.
- `purchases_creem_order_id_uidx` is **partial** (`WHERE creem_order_id IS NOT NULL`). `ON CONFLICT (creem_order_id) DO NOTHING` cannot infer this index. Local PostgreSQL reproduction fails; the corrected non-partial nullable unique index passes.
- 44 existing Paddle subscription rows: 38 active with a future period end (3 scheduled to cancel), 6 canceled. Active does not establish a real charge. No customer records were changed.

QA `nzhjzdmuevwsaldpqlxd`: corrected full unique index active; `creem-checkout` v11, `creem-webhook` v13, `admin-metrics` v1. Four prior Sandbox Pro attempts completed. No new paid Sandbox Packs transaction has been verified.

## Preconditions for commercial GO

1. In the Creem Sandbox and QA account, execute a €19 Packs one-time checkout and confirm the actual signed `checkout.completed`, paid order ID, persisted `purchases.creem_order_id`, effective `profiles.current_plan='packs'`, Packs and Learn access, and duplicate delivery without extra purchase. Also reject invalid signature/product/amount. Check no QA function uses Live credentials or production project ID. This gate is not satisfied by local mocks.
2. Obtain the Creem Live order list for the period since Packs checkout activation. Match paid Packs orders to the database. If a paid order lacks a purchase, record its order ID and account binding privately and reconcile **after** migration, using a verified signed event/provider record and the existing safe reconciliation procedure. Do not infer paid from an initiated checkout or change Paddle rights.
3. Confirm a recent, restorable production database backup or PITR recovery point through Supabase before schema changes. The connector used here does not expose backup management; a backup has not been independently confirmed. Record backup timestamp and restore destination. Do not perform a production migration without this gate and the owner's explicit authorization.

## Approved release order (execution requires owner's approval)

1. Freeze new Packs checkout or keep the sales gate closed while publishing. Capture preflight counts and index definition again. Record the current Edge Function versions and deployed site commit.
2. Merge #47, #48, #51, #49 in that order, each reviewed. #50 is a QA integration proof only and must not also be merged. Verify the resulting tree against #50 (the QA integration test script additionally includes the admin outage test).
3. Apply only `supabase/migrations/20261125120000_creem_packs_order_conflict.sql` to production after backup approval. It drops the partial index and creates a unique index on the nullable order ID. PostgreSQL permits multiple NULLs, retaining existing legacy purchases. The DDL runs in one transaction under the migration runner; recheck index definition and purchase counts.
4. Publish `creem-webhook` from #48, then `admin-metrics` from #47 and `creem-checkout` as needed to align the deployed source with the reviewed main commit; preserve `verify_jwt=false` for the signed webhook and `verify_jwt=true` for checkout/admin. Deploy the site from the reviewed main commit and verify its Supabase project and paid-checkout gate. Do not repoint any customer account to QA.
5. No-charge post-deploy checks: authenticate with a QA-designated account only, verify Free signup CTA, verify monthly (€9), annual (€90) and Packs (€19, one-time) hosted-checkout creation without submitting a real payment, verify signed webhook endpoint rejects an invalid signature, and check existing Paddle subscription counts/periods and the two known payers' rights without writing. Compare provider health, Edge Function logs and the index. Only then enable Packs sales.

## Rollback and entitlement recovery

- If a rollout fails before accepting new Packs orders, close the paid checkout gate, restore the prior site and Edge Function versions, and keep the corrected full unique index: it is backward compatible and needed for any Packs order written under the new webhook. Do **not** restore the incompatible partial index while the current Packs upsert remains active.
- If a payment may have completed, do not delete purchases or reset subscriptions. Keep checkout closed; compare Creem paid order IDs against `purchases.creem_order_id`, then replay/reconcile the verified signed paid event idempotently after fixing the underlying error. Compare the effective profile and RLS access. Escalate any uncertain ownership for manual review before a write.
- Use the confirmed backup/PITR only for database loss or corruption, in an isolated restore first. A database rollback can erase legitimate new orders; reconcile provider records before considering a production restore.
- Paddle rows and effective paid rights are out of scope for this migration. Never cancel or rewrite the two paid subscriptions as part of Packs recovery.

## Current decision

NO-GO for definitive Packs sales: the production index is incompatible and the complete Sandbox paid transaction remains unverified. The migration, tests and QA deployment are prepared; no production migration, merge, deployment or real charge has been performed by this plan.
