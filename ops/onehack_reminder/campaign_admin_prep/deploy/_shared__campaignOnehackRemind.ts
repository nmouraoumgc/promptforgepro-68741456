// ONEHACK_REMIND: reminder to OneHack signups that ONEHACK100 (100% off the first month of Pro monthly) is still
// claimable. Variants: batch 'main' and batch 'failed' (checkout failed: bank decline / 3DS / too many attempts).
// Source of truth for the copy: /workspace/pfp/onehack_reminder/reminder_en_{main,failed}.(html|txt). Pure function.
export const ONEHACK_REMIND_CAMPAIGN = 'ONEHACK_REMIND';
export const ONEHACK100_CODE = 'ONEHACK100';
export const ONEHACK100_DISCOUNT_ID = 'dsc_01m63wcnrqefjr1v8dx98vtgsn';
export const ONEHACK_REMIND_BATCHES = ['main', 'failed'];

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SUBJECT_MAIN = "Your free month of Pro is still waiting";
function html_main(claimHtml: string, unsubHtml: string, uses: string) { return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>Your free month of Pro is still waiting</title></head>
<body style="margin:0;padding:0;background:#f4f4f6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${uses} of 50 OneHack codes left, valid until 28 Nov. €0 today, cancel anytime.&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
<tr><td style="background:#14151b;padding:22px 32px;">
  <span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:8px;background:#f97316;color:#fff;font-weight:700;font-size:16px;vertical-align:middle;">P</span>
  <span style="font-size:18px;font-weight:700;color:#ffffff;vertical-align:middle;margin-left:8px;">Prompt<span style="color:#f97316;">Forge</span> Pro</span>
</td></tr>
<tr><td style="padding:32px 32px 8px;">
  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi there,</p>
  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">You signed up for PromptForge Pro through the OneHack post, and your free month of Pro is still unclaimed. Good news: the code still works.</p><p style="margin:0 0 16px;font-size:16px;line-height:1.6;">The button below opens Pricing with ONEHACK100 already applied. Choose Pro, continue to payment, and Paddle shows €0.00 due today. Pro is active straight away.</p>
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr><td style="background:#fff7ed;border:1px dashed #f97316;border-radius:10px;padding:14px 16px;">
  <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#c2410c;margin-bottom:8px;">Your OneHack offer</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td valign="top" style="padding:3px 12px 3px 0;font-size:14px;color:#6b7280;white-space:nowrap;">Code</td><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#14151b;font-family:Menlo,Consolas,monospace;font-weight:700;">ONEHACK100</td></tr><tr><td valign="top" style="padding:3px 12px 3px 0;font-size:14px;color:#6b7280;white-space:nowrap;">What you get</td><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#14151b;">1 month of Pro, 100% off</td></tr><tr><td valign="top" style="padding:3px 12px 3px 0;font-size:14px;color:#6b7280;white-space:nowrap;">Due today</td><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#14151b;">€0 / $0</td></tr><tr><td valign="top" style="padding:3px 12px 3px 0;font-size:14px;color:#6b7280;white-space:nowrap;">Codes left</td><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#14151b;">${uses} of 50</td></tr><tr><td valign="top" style="padding:3px 12px 3px 0;font-size:14px;color:#6b7280;white-space:nowrap;">Valid until</td><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#14151b;">28 Nov 2026, 13:00 Lisbon time, or until the codes run out</td></tr></table></td></tr></table>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto 20px;"><tr><td align="center" style="border-radius:10px;background:#f97316;">
    <a href="${claimHtml}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">Claim my free month &rarr;</a>
  </td></tr></table>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">Paddle asks for a card or PayPal to start the subscription, but nothing is charged today. After the free month it renews at €9/month ($9 in some countries) unless you cancel, which you can do anytime from your Account page.</p>
  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">If anything gets in the way, just reply to this email. I read every reply.</p>
  <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Nuno, PromptForge Pro</p>
</td></tr>
<tr><td style="padding:18px 32px 26px;border-top:1px solid #eee;font-size:12px;line-height:1.6;color:#6b7280;">
  You&#x27;re receiving this because you signed up for PromptForge Pro through the OneHack post.<br>
  <a href="${unsubHtml}" style="color:#6b7280;">Unsubscribe</a> &middot; <a href="https://promptforgepro.me" style="color:#6b7280;">promptforgepro.me</a>
</td></tr>
</table>
</td></tr></table>
</body></html>
`; }
function text_main(v: { claimUrl: string; unsubscribeUrl: string }, uses: string) { return `Hi there,

You signed up for PromptForge Pro through the OneHack post, and your free month of Pro is still unclaimed. Good news: the code still works.

The button below opens Pricing with ONEHACK100 already applied. Choose Pro, continue to payment, and Paddle shows €0.00 due today. Pro is active straight away.

Your OneHack offer
- Code: ONEHACK100
- What you get: 1 month of Pro, 100% off
- Due today: €0 / $0
- Codes left: ${uses} of 50
- Valid until: 28 Nov 2026, 13:00 Lisbon time, or until the codes run out

Claim my free month: ${v.claimUrl}

Paddle asks for a card or PayPal to start the subscription, but nothing is charged today. After the free month it renews at €9/month ($9 in some countries) unless you cancel, which you can do anytime from your Account page.

If anything gets in the way, just reply to this email. I read every reply.

Nuno, PromptForge Pro

You're receiving this because you signed up for PromptForge Pro through the OneHack post. Unsubscribe: ${v.unsubscribeUrl}
`; }
const SUBJECT_FAILED = "Something went wrong with your free month. Try again?";
function html_failed(claimHtml: string, unsubHtml: string, uses: string) { return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>Something went wrong with your free month. Try again?</title></head>
<body style="margin:0;padding:0;background:#f4f4f6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Your last checkout didn&#x27;t go through. Nothing was charged and the code still works.&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
<tr><td style="background:#14151b;padding:22px 32px;">
  <span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:8px;background:#f97316;color:#fff;font-weight:700;font-size:16px;vertical-align:middle;">P</span>
  <span style="font-size:18px;font-weight:700;color:#ffffff;vertical-align:middle;margin-left:8px;">Prompt<span style="color:#f97316;">Forge</span> Pro</span>
</td></tr>
<tr><td style="padding:32px 32px 8px;">
  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi there,</p>
  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">You tried to claim your free month of Pro with ONEHACK100, but the checkout didn&#x27;t go through. Sorry about that. Nothing was charged and the code was not used, so you can try again.</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="background:#f9fafb;border-left:3px solid #f97316;border-radius:6px;padding:12px 16px;">
  <div style="font-size:14px;font-weight:700;color:#14151b;margin-bottom:6px;">Why it usually fails</div>
  <div style="font-size:14px;line-height:1.55;color:#374151;margin-bottom:6px;">To start the subscription, Paddle checks your card with a €0 verification, and some banks decline it or ask for extra confirmation. What helps:</div>
  <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:#374151;"><li>Try another card, or PayPal.</li><li>Turn on online (and international) payments in your banking app.</li><li>Approve the 3D Secure request from your bank when it pops up.</li></ul></td></tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr><td style="background:#fff7ed;border:1px dashed #f97316;border-radius:10px;padding:14px 16px;">
  <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#c2410c;margin-bottom:8px;">Your OneHack offer</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td valign="top" style="padding:3px 12px 3px 0;font-size:14px;color:#6b7280;white-space:nowrap;">Code</td><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#14151b;font-family:Menlo,Consolas,monospace;font-weight:700;">ONEHACK100</td></tr><tr><td valign="top" style="padding:3px 12px 3px 0;font-size:14px;color:#6b7280;white-space:nowrap;">What you get</td><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#14151b;">1 month of Pro, 100% off</td></tr><tr><td valign="top" style="padding:3px 12px 3px 0;font-size:14px;color:#6b7280;white-space:nowrap;">Due today</td><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#14151b;">€0 / $0</td></tr><tr><td valign="top" style="padding:3px 12px 3px 0;font-size:14px;color:#6b7280;white-space:nowrap;">Codes left</td><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#14151b;">${uses} of 50</td></tr><tr><td valign="top" style="padding:3px 12px 3px 0;font-size:14px;color:#6b7280;white-space:nowrap;">Valid until</td><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#14151b;">28 Nov 2026, 13:00 Lisbon time, or until the codes run out</td></tr></table></td></tr></table>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto 20px;"><tr><td align="center" style="border-radius:10px;background:#f97316;">
    <a href="${claimHtml}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">Try again &rarr;</a>
  </td></tr></table>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">The button opens Pricing with the code already applied, and Paddle shows €0.00 due today. After the free month Pro renews at €9/month ($9 in some countries) unless you cancel, which you can do anytime from your Account page.</p>
  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Still stuck? Just reply to this email and I&#x27;ll help you sort it out.</p>
  <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Nuno, PromptForge Pro</p>
</td></tr>
<tr><td style="padding:18px 32px 26px;border-top:1px solid #eee;font-size:12px;line-height:1.6;color:#6b7280;">
  You&#x27;re receiving this because you signed up for PromptForge Pro through the OneHack post.<br>
  <a href="${unsubHtml}" style="color:#6b7280;">Unsubscribe</a> &middot; <a href="https://promptforgepro.me" style="color:#6b7280;">promptforgepro.me</a>
</td></tr>
</table>
</td></tr></table>
</body></html>
`; }
function text_failed(v: { claimUrl: string; unsubscribeUrl: string }, uses: string) { return `Hi there,

You tried to claim your free month of Pro with ONEHACK100, but the checkout didn't go through. Sorry about that. Nothing was charged and the code was not used, so you can try again.

Why it usually fails
To start the subscription, Paddle checks your card with a €0 verification, and some banks decline it or ask for extra confirmation. What helps:
- Try another card, or PayPal.
- Turn on online (and international) payments in your banking app.
- Approve the 3D Secure request from your bank when it pops up.

Your OneHack offer
- Code: ONEHACK100
- What you get: 1 month of Pro, 100% off
- Due today: €0 / $0
- Codes left: ${uses} of 50
- Valid until: 28 Nov 2026, 13:00 Lisbon time, or until the codes run out

Try again: ${v.claimUrl}

The button opens Pricing with the code already applied, and Paddle shows €0.00 due today. After the free month Pro renews at €9/month ($9 in some countries) unless you cancel, which you can do anytime from your Account page.

Still stuck? Just reply to this email and I'll help you sort it out.

Nuno, PromptForge Pro

You're receiving this because you signed up for PromptForge Pro through the OneHack post. Unsubscribe: ${v.unsubscribeUrl}
`; }

export function renderOnehackRemind(v: { variant: string; claimUrl: string; unsubscribeUrl: string; usesLeft: number }): { subject: string; html: string; text: string } {
  const uses = String(Math.max(0, Math.floor(v.usesLeft)));
  const claimHtml = escAttr(v.claimUrl), unsubHtml = escAttr(v.unsubscribeUrl);
  if (v.variant === 'failed') return { subject: SUBJECT_FAILED, html: html_failed(claimHtml, unsubHtml, uses), text: text_failed(v, uses) };
  return { subject: SUBJECT_MAIN, html: html_main(claimHtml, unsubHtml, uses), text: text_main(v, uses) };
}
