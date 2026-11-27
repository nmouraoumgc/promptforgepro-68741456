// Creem discount codes accepted by creem-checkout. Each code is re-validated against the Creem
// API on every checkout (status, type, percentage, duration and product), so a code changed in
// the Creem dashboard fails closed instead of granting a different discount.
export type Billing = 'monthly' | 'annual' | 'packs';
export interface CheckoutCode {
  percentage: number;
  billings: Billing[];
  // Only accounts with a historical Paddle subscription row may use it.
  paddleOnly: boolean;
}
export const CHECKOUT_CODES: Record<string, CheckoutCode> = {
  PRODUCTHUNT20: { percentage: 20, billings: ['monthly', 'annual'], paddleOnly: false },
  // Paddle transition (27/11/2026): 50% off the first month of Pro monthly only.
  PADDLE50: { percentage: 50, billings: ['monthly'], paddleOnly: true },
};

export function checkoutCodeRule(code: string | null, billing: Billing): CheckoutCode | null {
  if (code === null) return null;
  const rule = Object.prototype.hasOwnProperty.call(CHECKOUT_CODES, code) ? CHECKOUT_CODES[code] : undefined;
  if (!rule || !rule.billings.includes(billing)) throw new Error('invalid_code');
  return rule;
}
