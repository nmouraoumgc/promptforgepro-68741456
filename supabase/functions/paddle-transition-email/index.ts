// PADDLE_TRANSITION notice. Manual only: no cron calls this function.
// Callers: an admin user JWT, or an internal caller (service role / Vault cron secret).
// Body: {action: 'dry_run' | 'send', lead_hours?: number (default 60, max 96), max?: number (<=100), dry_run?: boolean}
//  dry_run (default) -> counts only: eligible now, planned send dates (Lisbon), skip reasons. Sends nothing, writes nothing.
//  send              -> requires PADDLE_TRANSITION_EMAILS_ENABLED=true AND dry_run:false. Sends once per user
//                       (campaign_sends UNIQUE(campaign,user_id), claim pending->sending, Resend Idempotency-Key).
// Who: Paddle rows (no Creem id) active/trialing/paused/past_due whose period ends within lead_hours and whose
// 48h grace has not ended; trial accounts only (completed checkout with a 100% code or the trial price).
// Paid Paddle accounts are skipped (reason paid_pending_decision) until there is a decision for them.
// Skips: active Creem subscription, active plan_override, marketing unsubscribe, already sent.
// Never logs addresses or keys; the response has counts and 8-char internal ids only.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { isInternalCaller } from '../_shared/internalAuth.ts';
import { renderPaddleTransition, graceEnd, PADDLE_TRANSITION_CAMPAIGN, FOUNDER50_CODE } from '../_shared/campaignPaddleTransition.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const SITE = 'https://promptforgepro.me';
const FROM = 'PromptForge Pro <noreply@promptforgepro.me>';
const TRIAL_CODES = ['ONEHACK100', 'WELCOME100', '1PROFREE'];
const LIVE_STATUSES = ['active', 'trialing', 'paused', 'past_due'];
const H = 3600_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const lisbonDay = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
const short = (id: string) => id.slice(0, 8);

type Sub = { id: string; user_id: string; status: string; current_period_end: string | null; paddle_subscription_id: string | null; creem_subscription_id: string | null };

type Override = { user_id: string; expires_at: string | null };
type Attempt = { user_id: string; discount_code: string | null; price_id: string | null };
type Profile = { id: string; email: string | null };
type Send = { id: string; user_id: string; status: string };
type Pref = { user_id: string; marketing_unsubscribed: boolean; unsubscribe_token: string };

export async function plan(admin: SupabaseClient, now: number, leadHours: number) {
  const subs = await admin.from('subscriptions').select('id, user_id, status, current_period_end, paddle_subscription_id, creem_subscription_id');
  if (subs.error) throw new Error('subscriptions read failed');
  const all = (subs.data ?? []) as Sub[];
  const paddle = all.filter((s) => s.paddle_subscription_id && !s.creem_subscription_id && LIVE_STATUSES.includes(s.status) && s.current_period_end);
  // One row per user: the latest Paddle period.
  const byUser = new Map<string, Sub>();
  for (const s of paddle) {
    const prev = byUser.get(s.user_id);
    if (!prev || Date.parse(s.current_period_end!) > Date.parse(prev.current_period_end!)) byUser.set(s.user_id, s);
  }
  const live = [...byUser.values()].filter((s) => Date.parse(graceEnd(s.current_period_end!)) > now);
  const ids = live.map((s) => s.user_id);
  const none = ['00000000-0000-0000-0000-000000000000'];
  const [ov, ca, pr, cs] = await Promise.all([
    admin.from('plan_overrides').select('user_id, expires_at').in('user_id', ids.length ? ids : none),
    admin.from('checkout_attempts').select('user_id, discount_code, price_id').in('user_id', ids.length ? ids : none).eq('status', 'completed'),
    admin.from('profiles').select('id, email').in('id', ids.length ? ids : none),
    admin.from('campaign_sends').select('id, user_id, status').eq('campaign', PADDLE_TRANSITION_CAMPAIGN).in('user_id', ids.length ? ids : none),
  ]);
  if (ov.error || ca.error || pr.error || cs.error) throw new Error('eligibility read failed');
  if (ids.length) await admin.rpc('ensure_email_preferences', { _user_ids: ids });
  const prefs = await admin.from('email_preferences').select('user_id, marketing_unsubscribed, unsubscribe_token').in('user_id', ids.length ? ids : none);
  if (prefs.error) throw new Error('preferences read failed');

  const creem = new Set(all.filter((s) => s.creem_subscription_id && ['active', 'trialing', 'past_due'].includes(s.status) &&
    (!s.current_period_end || Date.parse(s.current_period_end) > now)).map((s) => s.user_id));
  const override = new Set(((ov.data ?? []) as Override[]).filter((o) => !o.expires_at || Date.parse(o.expires_at) > now).map((o) => o.user_id));
  const trial = new Set(((ca.data ?? []) as Attempt[]).filter((a) => TRIAL_CODES.includes(String(a.discount_code ?? '').toUpperCase()) || a.price_id === 'pro_trial').map((a) => a.user_id));
  const email = new Map(((pr.data ?? []) as Profile[]).map((p) => [p.id, p.email]));
  const sent = new Map(((cs.data ?? []) as Send[]).map((r) => [r.user_id, r]));
  const pref = new Map(((prefs.data ?? []) as Pref[]).map((p) => [p.user_id, p]));

  const skipped: Record<string, number> = {};
  const paidIds: string[] = [];
  const due: { sub: Sub; email: string; token: string }[] = [];
  const planned: Record<string, number> = {};
  for (const s of live) {
    const end = Date.parse(s.current_period_end!);
    const skip = (r: string) => { skipped[r] = (skipped[r] ?? 0) + 1; };
    if (creem.has(s.user_id)) { skip('has_creem'); continue; }
    if (override.has(s.user_id)) { skip('active_override'); continue; }
    if (!trial.has(s.user_id)) { skip('paid_pending_decision'); paidIds.push(short(s.id)); continue; }
    const prior = sent.get(s.user_id);
    if (prior && prior.status !== 'pending') { skip('already_' + prior.status); continue; }
    const p = pref.get(s.user_id);
    if (!p || p.marketing_unsubscribed) { skip('unsubscribed'); continue; }
    const addr = email.get(s.user_id);
    if (!addr) { skip('no_email'); continue; }
    // Planned send: 48h before the period end, or now if that moment has passed.
    const sendAt = Math.max(now, end - 48 * H);
    planned[lisbonDay(sendAt)] = (planned[lisbonDay(sendAt)] ?? 0) + 1;
    if (end <= now + leadHours * H) due.push({ sub: s, email: addr, token: p.unsubscribe_token });
  }
  return { due, planned, skipped, paidIds, inGrace: live.length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (!(await isInternalCaller(req))) {
      const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
      const { data: u } = await admin.auth.getUser(token);
      if (!u?.user) return json({ error: 'auth' }, 401);
      const { data: role } = await admin.from('user_roles').select('role').eq('user_id', u.user.id).eq('role', 'admin').maybeSingle();
      if (!role) return json({ error: 'forbidden' }, 403);
    }
    const b = await req.json().catch(() => ({}));
    const leadHours = Math.min(Math.max(Number(b.lead_hours ?? 60) || 60, 1), 96);
    const max = Math.min(Math.max(Number(b.max ?? 100) || 100, 1), 100);
    const now = Date.now();
    const p = await plan(admin, now, leadHours);
    const summary = { campaign: PADDLE_TRANSITION_CAMPAIGN, lead_hours: leadHours, paddle_accounts_in_grace_window: p.inGrace,
      due_now: p.due.length, planned_send_by_lisbon_day: p.planned, skipped: p.skipped, paid_pending_decision_ids: p.paidIds };

    const wantSend = b.action === 'send' && b.dry_run === false;
    if (!wantSend) return json({ dry_run: true, ...summary });
    if (Deno.env.get('PADDLE_TRANSITION_EMAILS_ENABLED') !== 'true') return json({ error: 'disabled', hint: 'PADDLE_TRANSITION_EMAILS_ENABLED is not true', ...summary }, 409);
    const key = Deno.env.get('RESEND_API_KEY');
    if (!key) return json({ error: 'RESEND_API_KEY missing' }, 500);

    const out = { dry_run: false, attempted: 0, sent: 0, failed: 0, skipped_claimed: 0, stopped: null as null | string, ...summary };
    for (const d of p.due.slice(0, max)) {
      const batch = lisbonDay(Date.parse(d.sub.current_period_end!));
      const ins = await admin.from('campaign_sends').upsert({ campaign: PADDLE_TRANSITION_CAMPAIGN, batch, user_id: d.sub.user_id, email: d.email },
        { onConflict: 'campaign,user_id', ignoreDuplicates: true });
      if (ins.error) { out.failed++; continue; }
      const { data: claimed } = await admin.from('campaign_sends').update({ status: 'sending' })
        .eq('campaign', PADDLE_TRANSITION_CAMPAIGN).eq('user_id', d.sub.user_id).eq('status', 'pending').select('id').maybeSingle();
      if (!claimed) { out.skipped_claimed++; continue; }
      out.attempted++;
      const claimUrl = `${SITE}/pricing?code=${FOUNDER50_CODE}&billing=monthly&c=${PADDLE_TRANSITION_CAMPAIGN}&r=${claimed.id}`;
      const unsubscribeUrl = `${SITE}/unsubscribe?t=${d.token}`;
      const m = renderPaddleTransition({ periodEnd: d.sub.current_period_end!, claimUrl, unsubscribeUrl });
      const oneClick = `${Deno.env.get('SUPABASE_URL')}/functions/v1/unsubscribe?t=${d.token}`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `${PADDLE_TRANSITION_CAMPAIGN}-${d.sub.user_id}` },
        body: JSON.stringify({ from: FROM, to: [d.email], reply_to: Deno.env.get('RESEND_REPLY_TO') ?? 'geral@promptforgepro.me', subject: m.subject, html: m.html, text: m.text,
          headers: { 'List-Unsubscribe': `<${oneClick}>, <${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
          tags: [{ name: 'campaign', value: PADDLE_TRANSITION_CAMPAIGN }, { name: 'batch', value: batch }] }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        await admin.from('campaign_sends').update({ status: 'sent', resend_id: body?.id ?? null, sent_at: new Date().toISOString(), error: null }).eq('id', claimed.id);
        out.sent++;
      } else {
        const errName = String(body?.name ?? res.status);
        if (res.status === 429) { await admin.from('campaign_sends').update({ status: 'pending' }).eq('id', claimed.id); out.stopped = errName; break; }
        await admin.from('campaign_sends').update({ status: 'failed', error: errName.slice(0, 200) }).eq('id', claimed.id);
        out.failed++;
      }
      await sleep(260);
    }
    return json(out);
  } catch (e) {
    console.error('paddle-transition-email error:', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'server' }, 500);
  }
});
