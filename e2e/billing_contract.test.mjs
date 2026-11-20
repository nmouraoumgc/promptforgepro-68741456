import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const contract = readFileSync(new URL('../src/lib/billing/provider-contract.ts', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../src/lib/billing/price-catalog.ts', import.meta.url), 'utf8');
const reconciliation = readFileSync(new URL('../src/lib/billing/event-reconciliation.ts', import.meta.url), 'utf8');

test('new payment activation remains fail-closed', () => {
  assert.match(contract, /NEW_BILLING_ENABLED = false as const/);
  assert.match(contract, /PAYMENTS_TEMPORARILY_UNAVAILABLE/);
});
test('legacy Paddle remains distinct from new provider options', () => {
  assert.match(contract, /HistoricalBillingProvider = 'paddle'/);
  for (const provider of ['dodo', 'creem', 'fastspring']) assert.ok(contract.includes(provider));
});
test('catalog retains approved product prices', () => {
  for (const price of ['900', '9000', '1900']) assert.ok(catalog.includes('amountCents: ' + price));
});
test('reconciliation requires deduplication and timestamp ordering', () => {
  assert.match(reconciliation, /seenEventKeys\.has\(key\)/);
  assert.match(reconciliation, /occurred < latest/);
  assert.match(reconciliation, /occurred === latest/);
  assert.match(reconciliation, /AFTER signature verification/);
});
