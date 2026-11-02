// WELCOME100 all-users campaign email (100% off the first month of Pro monthly). Pure function, shared by
// campaign-admin. Source of truth for the copy: /workspace/pfp/campaign/welcome100_email.(html|md).
export const WELCOME100_CODE = 'WELCOME100';
export const WELCOME100_SUBJECT = 'Your first month of PromptForge Pro is on us';

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderWelcome100(v: { claimUrl: string; unsubscribeUrl: string }): { subject: string; html: string; text: string } {
  const claimUrlHtml = escAttr(v.claimUrl);
  const unsubHtml = escAttr(v.unsubscribeUrl);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>Your first month of PromptForge Pro is on us</title></head>
<body style="margin:0;padding:0;background:#f4f4f6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Use code WELCOME100 to get Pro free for 30 days. Free stays free.&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
<tr><td style="background:#14151b;padding:22px 32px;">
  <span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:8px;background:#f97316;color:#fff;font-weight:700;font-size:16px;vertical-align:middle;">P</span>
  <span style="font-size:18px;font-weight:700;color:#ffffff;vertical-align:middle;margin-left:8px;">Prompt<span style="color:#f97316;">Forge</span> Pro</span>
</td></tr>
<tr><td style="padding:32px 32px 8px;">
  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi there,</p>
  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Thanks for creating a PromptForge Pro account. To say thank you, <strong>your first month of Pro is on us.</strong></p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr><td align="center" style="background:#fff7ed;border:2px dashed #f97316;border-radius:10px;padding:16px;">
    <div style="font-size:13px;color:#6b7280;letter-spacing:.06em;text-transform:uppercase;">Your code</div>
    <div style="font-size:26px;font-weight:800;letter-spacing:.08em;color:#14151b;margin-top:4px;">WELCOME100</div>
    <div style="font-size:14px;color:#374151;margin-top:4px;">100% off your first month of Pro monthly</div>
  </td></tr></table>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr><td align="center" style="border-radius:10px;background:#f97316;">
    <a href="${claimUrlHtml}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">Claim my free month</a>
  </td></tr></table>
  <p style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#f97316;">How to redeem</p>
  <ol style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.6;">
    <li>Open the link above and sign in with this email address.</li>
    <li>Choose <strong>Pro</strong>. The code WELCOME100 is already filled in (or type it in the promo field).</li>
    <li>Checkout is handled by Paddle. Your first month is <strong>&euro;0 instead of &euro;9</strong>.</li>
  </ol>
  <p style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#f97316;">What Pro includes</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td valign="top" style="padding:0 10px 10px 0;width:18px;color:#f97316;font-size:16px;line-height:1.5;">&#10003;</td><td style="padding:0 0 10px;font-size:15px;line-height:1.5;"><strong>100 prompt runs per day</strong> (Free: 5)</td></tr><tr><td valign="top" style="padding:0 10px 10px 0;width:18px;color:#f97316;font-size:16px;line-height:1.5;">&#10003;</td><td style="padding:0 0 10px;font-size:15px;line-height:1.5;"><strong>Unlimited optimisations</strong> (Free: 3 per prompt)</td></tr><tr><td valign="top" style="padding:0 10px 10px 0;width:18px;color:#f97316;font-size:16px;line-height:1.5;">&#10003;</td><td style="padding:0 0 10px;font-size:15px;line-height:1.5;"><strong>Version history</strong> for your saved prompts</td></tr><tr><td valign="top" style="padding:0 10px 10px 0;width:18px;color:#f97316;font-size:16px;line-height:1.5;">&#10003;</td><td style="padding:0 0 10px;font-size:15px;line-height:1.5;"><strong>3 Brand Kit profiles</strong> (Free: 1)</td></tr><tr><td valign="top" style="padding:0 10px 10px 0;width:18px;color:#f97316;font-size:16px;line-height:1.5;">&#10003;</td><td style="padding:0 0 10px;font-size:15px;line-height:1.5;"><strong>A/B prompt testing</strong></td></tr><tr><td valign="top" style="padding:0 10px 10px 0;width:18px;color:#f97316;font-size:16px;line-height:1.5;">&#10003;</td><td style="padding:0 0 10px;font-size:15px;line-height:1.5;"><strong>Detailed scoring</strong></td></tr><tr><td valign="top" style="padding:0 10px 10px 0;width:18px;color:#f97316;font-size:16px;line-height:1.5;">&#10003;</td><td style="padding:0 0 10px;font-size:15px;line-height:1.5;"><strong>Export</strong></td></tr><tr><td valign="top" style="padding:0 10px 10px 0;width:18px;color:#f97316;font-size:16px;line-height:1.5;">&#10003;</td><td style="padding:0 0 10px;font-size:15px;line-height:1.5;"><strong>All 18 Learn lessons</strong> (Free: 4)</td></tr>
  </table>
  <p style="margin:12px 0 10px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#f97316;">The small print</p>
  <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.6;color:#374151;">
    <li>After the free month, Pro is &euro;9/month and renews monthly until you cancel. Paddle asks for a payment method at checkout so Pro can continue, but nothing is charged today. Cancel any time from your account before the month ends and you pay nothing.</li>
    <li>One use per account, valid for the first 100 redemptions, until 29 November 2026 at 13:00 (Lisbon time, WET).</li>
    <li>Not included: Premium packs (separate one-time purchase) and other plans.</li>
    <li>Taxes are shown by Paddle at checkout and depend on your country.</li>
  </ul>
  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;"><strong>Not ready for Pro?</strong> The Free plan stays free, with no card needed. Keep using it as long as you like.</p>
  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Questions or feedback? Just reply to this email. I read every reply.</p>
  <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">See you inside,<br>Nuno, PromptForge Pro</p>
</td></tr>
<tr><td style="padding:18px 32px 26px;border-top:1px solid #eee;font-size:12px;line-height:1.6;color:#6b7280;">
  You're receiving this because you have a PromptForge Pro account.<br>
  <a href="${unsubHtml}" style="color:#6b7280;">Unsubscribe from offers</a> &middot; <a href="https://promptforgepro.me" style="color:#6b7280;">promptforgepro.me</a>
</td></tr>
</table>
</td></tr></table>
</body></html>
`;
  const text = `Hi there,

Thanks for creating a PromptForge Pro account. To say thank you, your first month of Pro is on us.

Use code WELCOME100 and get one month of Pro free (100% off your first month of Pro monthly).

Claim my free month: ${v.claimUrl}

How to redeem:
1. Open the link above and sign in with this email address.
2. Choose Pro. The code WELCOME100 is already filled in (or type it in the promo field).
3. Checkout is handled by Paddle. Your first month is €0 instead of €9.

What Pro includes:
- 100 prompt runs per day (Free: 5)
- Unlimited optimisations (Free: 3 per prompt)
- Version history for your saved prompts
- 3 Brand Kit profiles (Free: 1)
- A/B prompt testing
- Detailed scoring
- Export
- All 18 Learn lessons (Free: 4)

The small print:
- After the free month, Pro is €9/month and renews monthly until you cancel. Paddle asks for a payment method at checkout so Pro can continue, but nothing is charged today. Cancel any time from your account before the month ends and you pay nothing.
- One use per account, valid for the first 100 redemptions, until 29 November 2026 at 13:00 (Lisbon time, WET).
- Not included: Premium packs (separate one-time purchase) and other plans.
- Taxes are shown by Paddle at checkout and depend on your country.

Not ready for Pro? The Free plan stays free, with no card needed. Keep using it as long as you like.

Questions or feedback? Just reply to this email. I read every reply.

See you inside,
Nuno, PromptForge Pro

You're receiving this because you have a PromptForge Pro account. Unsubscribe from offers: ${v.unsubscribeUrl}
`;
  return { subject: WELCOME100_SUBJECT, html, text };
}
