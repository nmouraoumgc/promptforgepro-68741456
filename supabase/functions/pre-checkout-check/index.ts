import { createClient } from 'npm:@supabase/supabase-js@2';
import { gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback only: the maintained list lives in public.disposable_email_domains (is_disposable_email RPC).
const DISPOSABLE_FALLBACK = new Set([
  'mailinator.com','tempmail.com','temp-mail.org','10minutemail.com','guerrillamail.com',
  'sharklasers.com','yopmail.com','getnada.com','dispostable.com','trashmail.com','maildrop.cc',
]);

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_FAILED_PER_ACCOUNT = 3;   // failed payments (webhook) or failed payment events (Paddle.js) in 24h
const MAX_ATTEMPTS_PER_IP = 5;      // checkout attempts from the same IP (hashed) in 24h
const CODE_RE = /^[A-Z0-9]{3,32}$/;
const PRICE_FOR_INTENT: Record<string, string> = { pro_normal: 'pro_monthly' };

async function ipHash(req: Request): Promise<string | null> {
  const raw = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') || '').trim();
  if (!raw) return null;
  // Keyed hash: the raw IP is never stored or logged.
  const secret = Deno.env.get('IP_HASH_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('pfp-ip:' + raw.toLowerCase()));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function paddleJson(env: PaddleEnv, path: string, init?: RequestInit) {
  const r = await gatewayFetch(env, path, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`paddle ${init?.method ?? 'GET'} ${path.split('?')[0]} -> ${r.status} ${body?.error?.code ?? ''}`);
  return body;
}

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
    const intent = typeof body?.intent === 'string' ? body.intent.slice(0, 40) : undefined; // 'pro_trial' | 'pro_normal' | 'premium'
    const rawCode = typeof body?.discountCode === 'string' ? body.discountCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    const discountCode = rawCode || null;
    const environment: PaddleEnv = body?.environment === 'sandbox' ? 'sandbox' : 'live';
    const campaign = typeof body?.campaign === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(body.campaign) ? body.campaign : null;
    const campaignSend = typeof body?.campaignSend === 'string' && /^[0-9a-f-]{36}$/i.test(body.campaignSend) ? body.campaignSend : null;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const hash = await ipHash(req);
    const since = new Date(Date.now() - DAY_MS).toISOString();

    const block = async (reason: string) => {
      await admin.from('checkout_attempts').insert({
        user_id: userId, email, status: 'blocked', reason, price_id: intent ?? null,
        ip_hash: hash, discount_code: discountCode && CODE_RE.test(discountCode) ? discountCode : null,
      });
      return json({ allowed: false, reason });
    };

    // 1. Disposable email check (maintained DB blocklist, fallback to a small static list)
    const { data: disp, error: dispErr } = await admin.rpc('is_disposable_email', { _email: email });
    const domain = email.split('@')[1]?.toLowerCase().trim();
    if (disp === true || (dispErr && domain && DISPOSABLE_FALLBACK.has(domain))) {
      return json({ allowed: false, reason: 'disposable_email' });
    }

    // 2. Already redeemed trial?
    if (intent === 'pro_trial') {
      const { data: red } = await admin
        .from('trial_redemptions')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (red) return json({ allowed: false, reason: 'trial_already_used' });
    }

    // 3. Velocity: same account >= 3 failed payments in 24h (webhook-confirmed failed attempts or
    //    Paddle.js payment failure events), or same IP (hashed) >= 5 checkout attempts in 24h.
    const [{ count: failedAttempts }, { count: failedEvents }] = await Promise.all([
      admin.from('checkout_attempts').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('status', 'failed').gte('created_at', since),
      admin.from('checkout_events').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).in('event_name', ['checkout.payment.failed', 'checkout.payment.error']).gte('created_at', since),
    ]);
    if (Math.max(failedAttempts ?? 0, failedEvents ?? 0) >= MAX_FAILED_PER_ACCOUNT) {
      return await block('too_many_attempts');
    }
    if (hash) {
      const { count: ipAttempts } = await admin.from('checkout_attempts').select('id', { count: 'exact', head: true })
        .eq('ip_hash', hash).neq('status', 'blocked').gte('created_at', since);
      if ((ipAttempts ?? 0) >= MAX_ATTEMPTS_PER_IP) return await block('too_many_attempts_ip');
    }

    // Close out this user's stale open attempts (no Paddle completion/failure within 6h).
    await admin.from('checkout_attempts')
      .update({ status: 'abandoned', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'initiated')
      .lt('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString());

    // 4. Discount codes: confirmed email only, once per account, and the Paddle transaction (with the
    //    discount) is created here, server-side. Codes are API-only in Paddle (enabled_for_checkout=false),
    //    so they cannot be typed into or passed to the Paddle.js checkout directly.
    if (discountCode) {
      if (!CODE_RE.test(discountCode)) return await block('invalid_code');
      const priceExternalId = PRICE_FOR_INTENT[intent ?? ''];
      if (!priceExternalId) return await block('code_not_applicable');

      const { data: u } = await admin.auth.admin.getUserById(userId);
      if (!u?.user?.email_confirmed_at) return await block('email_not_confirmed');

      const { data: prev } = await admin.from('checkout_attempts')
        .select('id, status, paddle_transaction_id')
        .eq('user_id', userId).eq('discount_code', discountCode)
        .in('status', ['completed', 'initiated', 'abandoned', 'failed'])
        .order('created_at', { ascending: false }).limit(10);
      if ((prev ?? []).some((a) => a.status === 'completed')) return await block('code_already_used');
      // Webhook may lag: double-check earlier transactions with this code directly in Paddle.
      for (const a of (prev ?? []).filter((x) => x.paddle_transaction_id).slice(0, 5)) {
        try {
          const t = await paddleJson(environment, `/transactions/${encodeURIComponent(a.paddle_transaction_id!)}`);
          if (['completed', 'paid'].includes(t?.data?.status)) return await block('code_already_used');
        } catch { /* ignore */ }
      }

      let discount: any, priceId: string;
      try {
        const [d, p] = await Promise.all([
          paddleJson(environment, `/discounts?code=${encodeURIComponent(discountCode)}&status=active`),
          paddleJson(environment, `/prices?external_id=${encodeURIComponent(priceExternalId)}&status=active`),
        ]);
        discount = d?.data?.[0];
        priceId = p?.data?.[0]?.id;
      } catch (e) {
        console.error('pre-checkout-check paddle lookup', e instanceof Error ? e.message : String(e));
        return json({ allowed: false, reason: 'checkout_unavailable' });
      }
      if (!discount || discount.code?.toUpperCase() !== discountCode) return await block('invalid_code');
      if (discount.expires_at && Date.parse(discount.expires_at) <= Date.now()) return await block('code_expired');
      if (discount.usage_limit != null && discount.times_used >= discount.usage_limit) return await block('code_limit_reached');
      if (!priceId || (Array.isArray(discount.restrict_to) && discount.restrict_to.length && !discount.restrict_to.includes(priceId))) {
        return await block('code_not_applicable');
      }

      const { data: attempt } = await admin.from('checkout_attempts').insert({
        user_id: userId, email, status: 'initiated', price_id: intent, ip_hash: hash, discount_code: discountCode,
      }).select('id').maybeSingle();

      try {
        // Paddle customer for the account email (checkout is locked to it).
        let customerId: string | undefined = (await paddleJson(environment, `/customers?email=${encodeURIComponent(email)}`))?.data?.[0]?.id;
        if (!customerId) {
          customerId = (await paddleJson(environment, '/customers', { method: 'POST', body: JSON.stringify({ email }) }))?.data?.id;
        }
        // Localised currency from the caller's IP (used transiently, never stored).
        const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || '').trim();
        let currency: string | undefined;
        if (ip) {
          try {
            const pv = await paddleJson(environment, '/pricing-preview', {
              method: 'POST', body: JSON.stringify({ items: [{ price_id: priceId, quantity: 1 }], customer_ip_address: ip }),
            });
            currency = pv?.data?.currency_code;
          } catch { /* fall back to Paddle default */ }
        }
        const customData: Record<string, string> = { userId, ...(attempt?.id ? { attemptId: attempt.id } : {}), discountCode };
        if (campaign) customData.campaign = campaign;
        if (campaignSend) customData.campaignSend = campaignSend;
        const txn = await paddleJson(environment, '/transactions', {
          method: 'POST',
          body: JSON.stringify({
            items: [{ price_id: priceId, quantity: 1 }],
            customer_id: customerId,
            discount_id: discount.id,
            ...(currency ? { currency_code: currency } : {}),
            collection_mode: 'automatic',
            custom_data: customData,
          }),
        });
        const transactionId: string | undefined = txn?.data?.id;
        if (!transactionId) throw new Error('no transaction id');
        if (attempt?.id) {
          await admin.from('checkout_attempts').update({ paddle_transaction_id: transactionId, updated_at: new Date().toISOString() }).eq('id', attempt.id);
        }
        return json({ allowed: true, attemptId: attempt?.id ?? null, transactionId });
      } catch (e) {
        console.error('pre-checkout-check paddle transaction', e instanceof Error ? e.message : String(e));
        if (attempt?.id) await admin.from('checkout_attempts').update({ status: 'abandoned', reason: 'txn_create_failed', updated_at: new Date().toISOString() }).eq('id', attempt.id);
        return json({ allowed: false, reason: 'checkout_unavailable' });
      }
    }

    // Log attempt. The id is passed to Paddle as customData.attemptId so the
    // webhook can close the loop (completed / failed) by transaction id.
    const { data: attempt } = await admin.from('checkout_attempts').insert({
      user_id: userId,
      email,
      status: 'initiated',
      price_id: intent,
      ip_hash: hash,
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
