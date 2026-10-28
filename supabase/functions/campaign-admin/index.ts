// Admin-only campaign tooling (caller must have the 'admin' role). Actions:
//  status          {campaign, batch}
//  preview         {campaign, batch, expires_at}            -> rendered HTML for the first recipient (no send)
//  activate_discount {discount_id, expires_at}              -> Paddle discount: status active + expiry
//  send            {campaign, batch, expires_at, dry_run=true, max=100}
// Sends one email per pending row via Resend with ~4 req/s throttling, idempotency keys,
// List-Unsubscribe headers, and stops on quota/rate errors. Never logs addresses or keys.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { gatewayFetch } from '../_shared/paddle.ts';
import { renderA1, BATCH_CODES } from '../_shared/campaignA1.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const SITE = 'https://promptforgepro.me';
const FROM = 'PromptForge Pro <noreply@promptforgepro.me>';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const lisbon = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: 'auth' }, 401);
    const { data: role } = await admin.from('user_roles').select('role').eq('user_id', u.user.id).eq('role', 'admin').maybeSingle();
    if (!role) return json({ error: 'forbidden' }, 403);

    const b = await req.json().catch(() => ({}));
    const campaign = String(b.campaign ?? 'early_access_2026'), batch = String(b.batch ?? 'A1');

    if (b.action === 'status') {
      const { data } = await admin.from('campaign_sends').select('status').eq('campaign', campaign).eq('batch', batch);
      const counts: Record<string, number> = {};
      for (const r of data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
      return json({ campaign, batch, counts });
    }

    if (b.action === 'activate_discount') {
      if (!/^dsc_[a-z0-9]{26}$/.test(String(b.discount_id)) || isNaN(Date.parse(b.expires_at))) return json({ error: 'discount_id / expires_at required' }, 400);
      const r = await gatewayFetch('live', `/discounts/${b.discount_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'active', expires_at: new Date(b.expires_at).toISOString() }) });
      const d = await r.json().catch(() => ({}));
      return json({ http: r.status, status: d?.data?.status, expires_at: d?.data?.expires_at, code: d?.data?.code, usage_limit: d?.data?.usage_limit, error: d?.error?.code }, r.ok ? 200 : 502);
    }

    if (b.action === 'preview' || b.action === 'send') {
      if (isNaN(Date.parse(b.expires_at))) return json({ error: 'expires_at required' }, 400);
      const code = BATCH_CODES[batch];
      if (!code) return json({ error: `no discount code configured for batch ${batch}` }, 400);
      const expiresLisbon = lisbon(b.expires_at);
      const max = Math.min(Number(b.max ?? 100), 100);
      const { data: rows, error } = await admin.from('campaign_sends')
        .select('id, user_id, email, first_name').eq('campaign', campaign).eq('batch', batch).eq('status', 'pending').order('created_at').limit(max);
      if (error) throw error;
      const ids = (rows ?? []).map((r) => r.user_id);
      await admin.rpc('ensure_email_preferences', { _user_ids: ids });
      const { data: prefs } = await admin.from('email_preferences').select('user_id, marketing_unsubscribed, unsubscribe_token').in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      const pref = new Map((prefs ?? []).map((p) => [p.user_id, p]));
      const build = (r: { id: string; user_id: string; first_name: string | null }) => {
        const t = pref.get(r.user_id)!.unsubscribe_token;
        return { ...renderA1({ firstName: r.first_name, expiresLisbon, code, claimUrl: `${SITE}/pricing?code=${code}&c=${encodeURIComponent(batch)}&r=${r.id}`, unsubscribeUrl: `${SITE}/unsubscribe?t=${t}` }),
          oneClick: `${Deno.env.get('SUPABASE_URL')}/functions/v1/unsubscribe?t=${t}` };
      };
      if (b.action === 'preview') return json({ pending: rows?.length ?? 0, expiresLisbon, code, sample: rows?.[0] ? build(rows[0]).html : null });

      const dry = b.dry_run !== false;
      const key = Deno.env.get('RESEND_API_KEY');
      if (!dry && !key) return json({ error: 'RESEND_API_KEY missing' }, 500);
      const out = { dry_run: dry, attempted: 0, sent: 0, skipped_unsubscribed: 0, failed: 0, stopped: null as null | string, quota: {} as Record<string, string | null> };
      for (const r of rows ?? []) {
        const p = pref.get(r.user_id);
        if (!p || p.marketing_unsubscribed) {
          if (!dry) await admin.from('campaign_sends').update({ status: 'skipped_unsubscribed' }).eq('id', r.id);
          out.skipped_unsubscribed++; continue;
        }
        out.attempted++;
        if (dry) continue;
        // Claim the row first so a parallel/retried run can't double-send.
        const { data: claimed } = await admin.from('campaign_sends').update({ status: 'sending' }).eq('id', r.id).eq('status', 'pending').select('id').maybeSingle();
        if (!claimed) continue;
        const m = build(r);
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `${campaign}-${batch}-${r.user_id}` },
          body: JSON.stringify({ from: FROM, to: [r.email], reply_to: Deno.env.get('RESEND_REPLY_TO') ?? 'geral@promptforgepro.me', subject: m.subject, html: m.html, text: m.text,
            headers: { 'List-Unsubscribe': `<${m.oneClick}>, <${SITE}/unsubscribe?t=${p.unsubscribe_token}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
            tags: [{ name: 'campaign', value: campaign }, { name: 'batch', value: batch }] }),
        });
        out.quota = { daily: res.headers.get('x-resend-daily-quota'), monthly: res.headers.get('x-resend-monthly-quota') };
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          await admin.from('campaign_sends').update({ status: 'sent', resend_id: body?.id ?? null, sent_at: new Date().toISOString(), error: null }).eq('id', r.id);
          out.sent++;
        } else {
          const errName = String(body?.name ?? res.status);
          // Quota / rate problems: put the row back to pending and stop; rerun later resumes.
          if (res.status === 429) { await admin.from('campaign_sends').update({ status: 'pending' }).eq('id', r.id); out.stopped = errName; break; }
          await admin.from('campaign_sends').update({ status: 'failed', error: errName.slice(0, 200) }).eq('id', r.id);
          out.failed++;
        }
        await sleep(260); // ~4 requests/s, well under Resend's 10 req/s team limit
      }
      return json(out);
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    console.error('campaign-admin error:', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'server' }, 500);
  }
});
