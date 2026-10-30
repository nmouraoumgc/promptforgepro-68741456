import { Environment, Paddle, EventName } from 'npm:@paddle/paddle-node-sdk';

const getEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export { EventName };

export type PaddleEnv = 'sandbox' | 'live';

// Direct Paddle API (previously proxied via the Lovable connector gateway).
const PADDLE_BASE_URL: Record<PaddleEnv, string> = {
  live: 'https://api.paddle.com',
  sandbox: 'https://sandbox-api.paddle.com',
};

export function getConnectionApiKey(env: PaddleEnv): string {
  if (env === 'sandbox') {
    const key = Deno.env.get('PADDLE_SANDBOX_API_KEY');
    if (!key) throw new Error('Paddle sandbox is not configured (PADDLE_SANDBOX_API_KEY missing)');
    return key;
  }
  return getEnv('PADDLE_LIVE_API_KEY');
}

export function getPaddleClient(env: PaddleEnv): Paddle {
  const apiKey = getConnectionApiKey(env);
  return new Paddle(apiKey, {
    environment: env === 'sandbox' ? Environment.sandbox : Environment.production,
  });
}

export async function gatewayFetch(env: PaddleEnv, path: string, init?: RequestInit): Promise<Response> {
  const apiKey = getConnectionApiKey(env);
  return fetch(`${PADDLE_BASE_URL[env]}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...init?.headers,
    },
  });
}

export function getWebhookSecret(env: PaddleEnv): string {
  if (env === 'sandbox') return getEnv('PAYMENTS_SANDBOX_WEBHOOK_SECRET');
  // New name PADDLE_WEBHOOK_SECRET; legacy PAYMENTS_LIVE_WEBHOOK_SECRET still accepted.
  const secret = Deno.env.get('PADDLE_WEBHOOK_SECRET') ?? Deno.env.get('PAYMENTS_LIVE_WEBHOOK_SECRET');
  if (!secret) throw new Error('PADDLE_WEBHOOK_SECRET is not configured');
  return secret;
}

export async function verifyWebhook(req: Request, env: PaddleEnv) {
  const signature = req.headers.get('paddle-signature');
  const body = await req.text();
  const secret = getWebhookSecret(env);

  if (!signature || !body) {
    throw new Error('Missing signature or body');
  }

  const paddle = getPaddleClient(env);
  return await paddle.webhooks.unmarshal(body, secret, signature);
}

// ---------- Price aliases ----------
// Prices imported from Lovable carry import_meta.external_id (pro_monthly, premium_one_time, ...).
// Prices created later directly in Paddle cannot get an import_meta, so they are mapped here
// (Paddle price id -> logical external id). The logical id is what subscriptions.price_id stores
// and what the sync_profile_plan_from_subscription trigger maps to a plan.
export const PRICE_ALIASES: Record<PaddleEnv, Record<string, string>> = {
  live: {
    pro_annual: 'pri_01m67br0e15t23kqzaa4m3qa78', // Pro annual, 90 EUR/year (created 2026-10-30)
  },
  sandbox: {},
};

const ALIAS_BY_PADDLE_ID: Record<string, string> = Object.fromEntries(
  Object.values(PRICE_ALIASES).flatMap((m) => Object.entries(m).map(([ext, id]) => [id, ext])),
);

/** Logical external id of a Paddle price object (SDK camelCase or REST snake_case). */
// deno-lint-ignore no-explicit-any
export function priceExternalIdOf(price: any): string | null {
  return price?.importMeta?.externalId ?? price?.import_meta?.external_id ??
    price?.customData?.external_id ?? price?.custom_data?.external_id ??
    (typeof price?.id === 'string' ? ALIAS_BY_PADDLE_ID[price.id] : undefined) ?? null;
}

/** Paddle price id for a logical external id (alias first, then import_meta.external_id lookup). */
export async function resolvePriceId(env: PaddleEnv, externalId: string, activeOnly = false): Promise<string | null> {
  const alias = PRICE_ALIASES[env][externalId];
  if (alias) return alias;
  const r = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(externalId)}${activeOnly ? '&status=active' : ''}`);
  if (!r.ok) throw new Error(`Paddle price lookup failed (${r.status})`);
  const j = await r.json();
  return j?.data?.[0]?.id ?? null;
}
