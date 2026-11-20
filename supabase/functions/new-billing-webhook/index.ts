// Intentionally inert placeholder. No unverified payload is ever processed.
// Production webhook integration requires provider-specific raw-body signature
// verification, replay checks and atomic DB reconciliation.
Deno.serve((_req: Request) => new Response(
  JSON.stringify({ error: 'WEBHOOK_NOT_CONFIGURED' }),
  { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
));
