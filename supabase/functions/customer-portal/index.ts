import { createClient } from 'npm:@supabase/supabase-js@2';
import { gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Find a Paddle customer by email (users who checked out but have no
// subscription row, or whose plan was set manually).
async function findCustomerByEmail(env: PaddleEnv, email: string): Promise<string | null> {
  const res = await gatewayFetch(env, `/customers?email=${encodeURIComponent(email)}&status=active`);
  if (!res.ok) throw new Error(`Paddle customer lookup failed (${res.status})`);
  const body = await res.json();
  return body?.data?.[0]?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No authorization header provided' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: 'User not authenticated' }, 401);
    const user = userData.user;

    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('paddle_subscription_id, paddle_customer_id, environment')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subError) throw subError;

    const env: PaddleEnv = (sub?.environment as PaddleEnv) ?? 'live';
    let customerId: string | null = sub?.paddle_customer_id ?? null;
    if (!customerId && user.email) customerId = await findCustomerByEmail(env, user.email);

    if (!customerId) {
      // Not an error: e.g. premium granted manually, never went through Paddle.
      console.log('customer-portal: no Paddle customer for user', user.id);
      return json({ no_billing: true });
    }

    const subscriptionIds = sub?.paddle_subscription_id ? [sub.paddle_subscription_id] : [];
    const res = await gatewayFetch(env, `/customers/${customerId}/portal-sessions`, {
      method: 'POST',
      body: JSON.stringify({ subscription_ids: subscriptionIds }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Paddle portal session failed (${res.status}): ${body?.error?.code ?? 'unknown'}`);
    }

    const url = body?.data?.urls?.general?.overview;
    if (!url) throw new Error('Portal URL not returned');

    return json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('customer-portal error:', message);
    return json({ error: message }, 500);
  }
});
