import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','mailinator.net','tempmail.com','temp-mail.org','temp-mail.io',
  '10minutemail.com','10minutemail.net','guerrillamail.com','guerrillamail.net',
  'sharklasers.com','yopmail.com','getnada.com','getairmail.com','dispostable.com',
  'trashmail.com','throwawaymail.com','maildrop.cc','tempinbox.com','fakeinbox.com',
  'mailnesia.com','mintemail.com','mohmal.com','mytemp.email','emailondeck.com',
  'spam4.me','spambox.us','tempr.email','inboxbear.com','mailcatch.com',
  'mailtemp.info','tmpmail.org','tmpeml.com','mvrht.com','mailpoof.com',
  'tempmailo.com','minuteinbox.com','fakemailgenerator.com',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ allowed: false, reason: 'unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) return json({ allowed: false, reason: 'unauthorized' }, 401);
    const userId = claims.claims.sub as string;
    const email = (claims.claims.email as string | undefined) ?? '';

    const body = await req.json().catch(() => ({}));
    const intent = body?.intent as string | undefined; // 'pro_trial' | 'pro_normal' | 'premium'

    // 1. Disposable email check
    const domain = email.split('@')[1]?.toLowerCase().trim();
    if (domain && DISPOSABLE_DOMAINS.has(domain)) {
      return json({ allowed: false, reason: 'disposable_email' });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 2. Already redeemed trial?
    if (intent === 'pro_trial') {
      const { data: red } = await admin
        .from('trial_redemptions')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (red) return json({ allowed: false, reason: 'trial_already_used' });
    }

    // 3. Rate limit: max 5 failed attempts in last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('checkout_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'failed')
      .gte('created_at', since);
    if ((count ?? 0) >= 5) {
      return json({ allowed: false, reason: 'too_many_attempts' });
    }

    // Close out this user's stale open attempts (no Paddle completion/failure within 6h).
    await admin.from('checkout_attempts')
      .update({ status: 'abandoned', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'initiated')
      .lt('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString());

    // Log attempt. The id is passed to Paddle as customData.attemptId so the
    // webhook can close the loop (completed / failed) by transaction id.
    const { data: attempt } = await admin.from('checkout_attempts').insert({
      user_id: userId,
      email,
      status: 'initiated',
      price_id: intent,
    }).select('id').maybeSingle();

    return json({ allowed: true, attemptId: attempt?.id ?? null });
  } catch (e) {
    console.error('pre-checkout-check error', e);
    return json({ allowed: false, reason: 'internal_error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
