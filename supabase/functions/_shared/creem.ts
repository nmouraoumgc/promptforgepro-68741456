export function setting(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error('Missing billing configuration: ' + key);
  return value;
}

export function creemEnvironment() {
  const mode = setting('CREEM_MODE');
  const project = new URL(setting('SUPABASE_URL')).hostname.split('.')[0];
  if (project === 'nzhjzdmuevwsaldpqlxd' && mode !== 'test') {
    throw new Error('QA requires Creem test mode');
  }
  if (mode === 'live') return 'live';
  if (mode !== 'test' || project === 'cwrxbxxfaemcvliasycz') {
    throw new Error('Configure test billing on an isolated Supabase project');
  }
  return 'sandbox';
}

export function productFor(billing: 'monthly' | 'annual') {
  return setting(billing === 'annual' ? 'CREEM_PRO_ANNUAL_ID' : 'CREEM_PRO_MONTHLY_ID');
}

export async function creemRequest(path: string, body?: Record<string, unknown>) {
  const origin = creemEnvironment() === 'live' ? 'https://api.creem.io' : 'https://test-api.creem.io';
  const res = await fetch(origin + '/v1/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-api-key': setting('CREEM_API_KEY'), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'error',
  });
  if (!res.ok) throw new Error('Creem returned HTTP ' + res.status);
  return await res.json();
}

export function hostedUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !(url.hostname === 'creem.io' || url.hostname.endsWith('.creem.io'))) {
    throw new Error('Invalid Creem redirect');
  }
  return url.href;
}

export async function validSignature(raw: string, signature: string | null, secret: string) {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['verify']);
  const bytes = Uint8Array.from(signature.match(/../g)!, pair => parseInt(pair,16));
  return crypto.subtle.verify('HMAC', key, bytes, encoder.encode(raw));
}
