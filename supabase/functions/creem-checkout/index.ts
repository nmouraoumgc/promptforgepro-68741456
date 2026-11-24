import { createClient } from 'npm:@supabase/supabase-js@2';
import { creemEnvironment, creemRequest, hostedUrl, productFor, setting } from '../_shared/creem.ts';
import { ipHash } from '../_shared/checkout-ip.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-store',
};
const json = (body: unknown, status = 200) => Response.json(body, {status, headers});

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null,{headers});
  if (req.method !== 'POST') return json({},405);
  if (Deno.env.get('CREEM_CHECKOUT_ENABLED') !== 'true') return json({reason:'maintenance'},503);
  try {
    const admin = createClient(setting('SUPABASE_URL'), setting('SUPABASE_SERVICE_ROLE_KEY'));
    const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return json({},401);
    const {data:{user},error} = await admin.auth.getUser(token);
    if (error || !user?.email) return json({},401);
    if (!user.email_confirmed_at) return json({reason:'email_not_confirmed'});

    const input = await req.json();
    if (!['monthly','annual','packs'].includes(input.billing)) return json({},400);
    const code = input.discountCode || null;
    if (code !== null && (input.billing === 'packs' || code !== 'PRODUCTHUNT20')) return json({reason:'invalid_code'});
    const hash = await ipHash(req);
    if (!hash) return json({reason:'checkout_unavailable'},503);
    const product = productFor(input.billing);
    const environment = creemEnvironment();
    const successUrl = new URL(input.billing === 'packs' ? '/purchase-success' : '/subscription-success', setting('CREEM_SITE_ORIGIN')).href;
    if (input.billing === 'packs') {
      const owned = await admin.from('profiles').select('current_plan').eq('id',user.id).maybeSingle();
      if (owned.data && ['packs','premium','pro'].includes(owned.data.current_plan)) return json({reason:'already_subscribed'});
    }
    const reservation = await admin.rpc('reserve_creem_checkout', {
      p_user:user.id, p_email:user.email, p_hash:hash, p_price:input.billing === 'packs' ? 'packs' : 'pro_' + input.billing,
      p_product:product, p_environment:environment, p_code:code,
    });
    if (reservation.error) throw reservation.error;
    const {reason,existing,url,attempt} = reservation.data;
    if (reason) return json({reason});
    if (existing) return url ? json({url:hostedUrl(url)}) : json({reason:'checkout_unavailable'});
    let checkoutRequested = false;
    try {
      const details = await creemRequest('products/' + encodeURIComponent(product));
      const annual = input.billing === 'annual';
      const packs = input.billing === 'packs';
      if (details.id !== product || details.currency !== 'EUR' || details.price !== (packs ? 1900 : annual ? 9000 : 900) ||
          (packs ? details.billing_type !== 'onetime' : (details.billing_type !== 'recurring' || details.billing_period !== (annual ? 'every-year' : 'every-month')))) {
        throw new Error('Product configuration mismatch');
      }
      if (code) {
        const discount = await creemRequest('discounts?discount_code=' + encodeURIComponent(code));
        if (discount.code !== code || discount.status !== 'active' || discount.type !== 'percentage' ||
            discount.duration !== 'once' || discount.percentage !== 20 || !discount.applies_to_products?.includes(product)) {
          throw new Error('Discount configuration mismatch');
        }
      }
      checkoutRequested = true;
      const checkout = await creemRequest('checkouts', {
        product_id:product, request_id:attempt, customer:{email:user.email}, success_url:successUrl,
        ...(code ? {discount_code:code} : {}),
      });
      const checkoutUrl = hostedUrl(checkout.checkout_url);
      if (!checkout.id) throw new Error('Missing checkout ID');
      const saved = await admin.from('creem_checkouts').update({
        checkout_id:checkout.id, checkout_url:checkoutUrl,
      }).eq('attempt_id',attempt).select('attempt_id').single();
      if (saved.error) throw saved.error;
      return json({url:checkoutUrl});
    } catch (err) {
      console.error('creem-checkout provider failure', {
        phase: checkoutRequested ? 'create_checkout' : 'validate_configuration',
        name: err instanceof Error ? err.name : 'UnknownError',
        message: err instanceof Error ? err.message : String(err),
      });
      await admin.from('checkout_attempts').update({status:checkoutRequested ? 'abandoned' : 'failed'}).eq('id',attempt);
      return json({reason:'checkout_unavailable'},503);
    }
  } catch {
    return json({reason:'checkout_unavailable'},503);
  }
});
