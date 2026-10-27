// Permanently deletes the caller's account after a typed confirmation.
// Blocks while a paid subscription is still active (cancel in the billing portal first).
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!token) return json({ error: 'Not authenticated', code: 'AUTH' }, 401);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u.user) return json({ error: 'Not authenticated', code: 'AUTH' }, 401);
    const user = u.user;

    const body = await req.json().catch(() => ({}));
    const confirm = String(body?.confirm ?? '').trim().toUpperCase();
    if (confirm !== 'APAGAR' && confirm !== 'DELETE') return json({ error: 'Confirmation text does not match', code: 'CONFIRM' }, 400);

    const { data: subs, error: se } = await admin.from('subscriptions')
      .select('status, cancel_at_period_end').eq('user_id', user.id);
    if (se) throw se;
    const blocking = (subs ?? []).some((s) => ['active', 'trialing', 'past_due', 'paused'].includes(String(s.status)) && !s.cancel_at_period_end);
    if (blocking) return json({ error: 'Cancel your subscription first', code: 'ACTIVE_SUBSCRIPTION' }, 409);

    await admin.from('promo_codes').update({ created_by: null }).eq('created_by', user.id);
    // All user tables cascade from auth.users.
    const { error: de } = await admin.auth.admin.deleteUser(user.id);
    if (de) throw de;
    console.log('delete-account: account deleted');
    return json({ deleted: true });
  } catch (e) {
    console.error('delete-account error:', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'Could not delete account', code: 'SERVER' }, 500);
  }
});
