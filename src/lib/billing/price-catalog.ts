import type { PurchaseIntent } from './provider-contract';

/** Informational catalog only. The server must use provider price IDs, not browser prices. */
export const BILLING_CATALOG: Readonly<Record<PurchaseIntent, {
  amountCents: number;
  currency: 'EUR';
  interval: 'month' | 'year' | 'once';
}>> = Object.freeze({
  pro_monthly: { amountCents: 900, currency: 'EUR', interval: 'month' },
  pro_annual: { amountCents: 9000, currency: 'EUR', interval: 'year' },
  packs: { amountCents: 1900, currency: 'EUR', interval: 'once' },
});

export function resolvePurchaseIntent(value: unknown): PurchaseIntent {
  if (value === 'pro_monthly' || value === 'pro_annual' || value === 'packs') return value;
  throw new Error('INVALID_PURCHASE_INTENT');
}
