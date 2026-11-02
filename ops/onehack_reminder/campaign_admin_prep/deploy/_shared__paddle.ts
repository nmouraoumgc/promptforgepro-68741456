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
