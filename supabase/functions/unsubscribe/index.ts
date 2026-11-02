// Marketing unsubscribe. POST {token} (from /unsubscribe page) or RFC 8058 one-click POST ?t=<token>.
// GET ?t=<token> only reports status (link scanners must not unsubscribe people).
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const url = new URL(req.url);
  let token = url.searchParams.get('t') ?? '';
  let resubscribe = false;
  if (req.method === 'POST') {
    const ct = req.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      const b = await req.json().catch(() => ({}));
      token = String(b?.token ?? token); resubscribe = b?.resubscribe === true;
    }
  }
  if (!UUID.test(token)) return json({ error: 'invalid token' }, 400);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (req.method === 'GET') {
    const { data } = await admin.from('email_preferences').select('marketing_unsubscribed').eq('unsubscribe_token', token).maybeSingle();
    if (!data) return json({ error: 'not found' }, 404);
    return json({ unsubscribed: data.marketing_unsubscribed });
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const { data, error } = await admin.from('email_preferences')
    .update({ marketing_unsubscribed: !resubscribe, unsubscribed_at: resubscribe ? null : new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('unsubscribe_token', token).select('user_id').maybeSingle();
  if (error) { console.error('unsubscribe error'); return json({ error: 'server' }, 500); }
  if (!data) return json({ error: 'not found' }, 404);
  return json({ unsubscribed: !resubscribe });
});
