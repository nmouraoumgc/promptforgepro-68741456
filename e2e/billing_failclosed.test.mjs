import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
test('new checkout endpoint is fail-closed', () => {
  const source = read('../supabase/functions/new-billing-checkout/index.ts');
  assert.match(source, /PAYMENTS_TEMPORARILY_UNAVAILABLE/);
  assert.match(source, /status: 503/);
  assert.doesNotMatch(source, /fetch\(/);
});
test('unconfigured webhook cannot acknowledge unverified payment', () => {
  const source = read('../supabase/functions/new-billing-webhook/index.ts');
  assert.match(source, /WEBHOOK_NOT_CONFIGURED/);
  assert.match(source, /status: 503/);
});
test('proposed ledger keeps provider-scoped identifiers', () => {
  const source = read('../docs/billing-schema-proposal.sql');
  assert.match(source, /PRIMARY KEY \(provider, event_id\)/);
  assert.match(source, /PRIMARY KEY \(provider, external_subscription_id\)/);
  assert.match(source, /billing_private/);
  assert.doesNotMatch(source, /ALTER TABLE public\.subscriptions/);
});
