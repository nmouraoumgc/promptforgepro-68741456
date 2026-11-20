/**
 * Provider-neutral billing contracts.
 * Preparation only: no checkout creation, no credentials, no production writes.
 */
export type NewBillingProvider = 'dodo' | 'creem' | 'fastspring';
export type HistoricalBillingProvider = 'paddle';
export type BillingProvider = NewBillingProvider | HistoricalBillingProvider;

export type PurchaseIntent = 'pro_monthly' | 'pro_annual' | 'packs';
export type BillingEnvironment = 'sandbox' | 'live';

export interface CheckoutRequest {
  intent: PurchaseIntent;
  userId: string;
  email: string;
  environment: BillingEnvironment;
  discountCode?: string;
  campaign?: string;
  idempotencyKey: string;
}

export interface CheckoutSession {
  provider: NewBillingProvider;
  providerCheckoutId: string;
  checkoutUrl: string;
  expiresAt?: string;
}

export interface VerifiedBillingEvent {
  provider: BillingProvider;
  providerEventId: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  providerTransactionId?: string;
  eventType: 'subscription_created' | 'subscription_updated' | 'subscription_canceled' | 'payment_succeeded' | 'payment_failed' | 'refund';
  occurredAt: string;
  userId?: string;
  intent?: PurchaseIntent;
}

export interface NewProviderAdapter {
  readonly provider: NewBillingProvider;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  verifyAndParseWebhook(payload: Uint8Array, headers: Headers): Promise<VerifiedBillingEvent>;
}

/** No provider may be activated until explicit approval and sandbox validation. */
export const NEW_BILLING_ENABLED = false as const;

export function assertNewBillingEnabled(): void {
  if (!NEW_BILLING_ENABLED) throw new Error('PAYMENTS_TEMPORARILY_UNAVAILABLE');
}

export function isPurchaseIntent(value: unknown): value is PurchaseIntent {
  return value === 'pro_monthly' || value === 'pro_annual' || value === 'packs';
}
