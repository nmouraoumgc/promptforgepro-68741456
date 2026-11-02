import { gatewayFetch, resolvePriceId, type PaddleEnv } from '../_shared/paddle.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function resolvePaddlePrice(priceId: string, environment: PaddleEnv): Promise<string> {
  const id = await resolvePriceId(environment, priceId);
  if (!id) throw new Error(`Price not found: ${priceId}`);
  return id;
}

async function resolvePaddleDiscount(discountCode: string, environment: PaddleEnv): Promise<string> {
  const response = await gatewayFetch(
    environment,
    `/discounts?code=${encodeURIComponent(discountCode)}&status=active`,
  );
  const data = await response.json();
  if (!data.data?.length) throw new Error(`Discount not found: ${discountCode}`);
  return data.data[0].id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId, discountCode, environment } = await req.json();
    if (!priceId && !discountCode) throw new Error('priceId or discountCode is required');
    const env: PaddleEnv = environment === 'live' ? 'live' : 'sandbox';

    const [paddleId, discountId] = await Promise.all([
      priceId ? resolvePaddlePrice(String(priceId), env) : Promise.resolve(undefined),
      discountCode ? resolvePaddleDiscount(String(discountCode), env) : Promise.resolve(undefined),
    ]);

    return new Response(JSON.stringify({ paddleId, discountId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('get-paddle-price error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
