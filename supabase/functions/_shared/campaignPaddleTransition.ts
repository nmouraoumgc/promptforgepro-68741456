// PADDLE_TRANSITION: one notice per Paddle trial account, about 48h before its free period ends.
// Paddle closed our seller account and confirmed in writing (24/11/2026) that these subscriptions
// pause at the next renewal without any charge. Access stays Pro until period end + 48h
// (expire-paddle-grace job), then the account can continue on Creem with PADDLE50.
// English only (27/11/2026: no Portuguese subscribers among these accounts). Times are shown in
// UTC, which is clearer for an international audience (Lisbon is UTC+0 in winter). Pure function.
// Copy mirrored in /workspace/pfp/paddle_transition/email_draft.md. No em dashes in the copy.
export const PADDLE_TRANSITION_CAMPAIGN = 'PADDLE_TRANSITION';
export const PADDLE50_CODE = 'PADDLE50';
export const PADDLE_GRACE_HOURS = 48;
export const PADDLE_TRANSITION_SUBJECT = 'Your Pro access and 50% off your first month';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function utcDate(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${date} at ${time} UTC`;
}

export function graceEnd(periodEndIso: string): string {
  return new Date(Date.parse(periodEndIso) + PADDLE_GRACE_HOURS * 3600_000).toISOString();
}

export function paddleTransitionCopy(periodEndIso: string) {
  const end = utcDate(periodEndIso), grace = utcDate(graceEnd(periodEndIso));
  const lines = [
    'Hi there,',
    `Thanks for trying PromptForge Pro. Your free month ends on ${end}.`,
    'We have changed payment provider and Paddle no longer processes our payments. So Paddle will not charge you anything, and there is nothing you need to cancel.',
    `To give you time to decide, your Pro access stays on until ${grace}.`,
    `If you want to keep going, from then on you can subscribe through Creem, our new payment provider, with 50% off your first month: €4.50 instead of €9 with the code ${PADDLE50_CODE}. After that it is €9 per month and you can cancel any time. The code is valid until 31 December 2026.`,
    'Any questions? Just reply to this email. I read every reply.',
  ];
  return { lines, cta: 'Continue with 50% off', sign: 'Nuno, PromptForge Pro' };
}

const FOOTER = 'You are receiving this because you had a PromptForge Pro subscription through Paddle.';

export function renderPaddleTransition(v: { periodEnd: string; claimUrl: string; unsubscribeUrl: string }): { subject: string; html: string; text: string } {
  const c = paddleTransitionCopy(v.periodEnd);
  const claim = esc(v.claimUrl), unsub = esc(v.unsubscribeUrl);
  const p = (t: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${esc(t)}</p>`;
  const button = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto 20px;"><tr><td align="center" style="border-radius:10px;background:#f97316;">
    <a href="${claim}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">${esc(c.cta)} &rarr;</a></td></tr></table>`;
  const codeBox = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr><td align="center" style="background:#fff7ed;border:2px dashed #f97316;border-radius:10px;padding:14px;">
    <div style="font-size:24px;font-weight:800;letter-spacing:.08em;color:#14151b;">${PADDLE50_CODE}</div>
    <div style="font-size:14px;color:#374151;margin-top:4px;">50% off your first month of Pro monthly</div></td></tr></table>`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(PADDLE_TRANSITION_SUBJECT)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Paddle will not charge you anything. Your Pro access continues for 48 more hours.&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
<tr><td style="background:#14151b;padding:22px 32px;">
  <span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:8px;background:#f97316;color:#fff;font-weight:700;font-size:16px;vertical-align:middle;">P</span>
  <span style="font-size:18px;font-weight:700;color:#ffffff;vertical-align:middle;margin-left:8px;">Prompt<span style="color:#f97316;">Forge</span> Pro</span>
</td></tr>
<tr><td style="padding:32px 32px 8px;">
${c.lines.slice(0, 5).map(p).join('\n')}
${codeBox}
${button}
${p(c.lines[5])}
${p(c.sign)}
</td></tr>
<tr><td style="padding:18px 32px 26px;border-top:1px solid #eee;font-size:12px;line-height:1.6;color:#6b7280;">
  ${esc(FOOTER)}<br>
  <a href="${unsub}" style="color:#6b7280;">Unsubscribe</a> &middot; <a href="https://promptforgepro.me" style="color:#6b7280;">promptforgepro.me</a>
</td></tr>
</table>
</td></tr></table>
</body></html>
`;
  const text = [...c.lines.slice(0, 5), `Code: ${PADDLE50_CODE}`, `${c.cta}: ${v.claimUrl}`, c.lines[5], c.sign].join('\n\n') +
    `\n\n${FOOTER}\nUnsubscribe: ${v.unsubscribeUrl}\n`;
  return { subject: PADDLE_TRANSITION_SUBJECT, html, text };
}
