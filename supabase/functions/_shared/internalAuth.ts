import { createClient } from 'npm:@supabase/supabase-js@2';

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** True only for trusted internal callers: service-role bearer (other edge functions) or the Vault cron secret header (pg_cron). */
export async function isInternalCaller(req: Request): Promise<boolean> {
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (safeEqual(bearer, service)) return true;
  const secret = req.headers.get('x-cron-secret') ?? '';
  if (secret.length < 32) return false;
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, service);
  const { data, error } = await admin.rpc('verify_cron_secret', { p_secret: secret });
  return !error && data === true;
}
