// Provider-neutral checkout entrypoint: deliberately disabled.
// No provider credentials, network calls or database writes are performed.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
    status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
  });
  // Keep this first. Authentication, pricing, provider APIs and idempotency
  // must be implemented and tested before the guard can be removed.
  return new Response(JSON.stringify({ error: 'PAYMENTS_TEMPORARILY_UNAVAILABLE' }), {
    status: 503, headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
