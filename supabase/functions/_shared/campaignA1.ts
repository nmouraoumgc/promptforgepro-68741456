// Early-access email (batch A1). Pure function: shared by the campaign-admin edge function and the local preview renderer.
export interface A1Vars { firstName?: string | null; expiresLisbon: string; claimUrl: string; unsubscribeUrl: string }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const A1_SUBJECT = 'PromptForge Pro is back — and better. 24h gift inside 🎁';
export const A1_PREVIEW = 'Your exclusive code expires in 24 hours.';
export const A1_CODE = 'EARLYA1';

export function renderA1(v: A1Vars): { subject: string; html: string; text: string } {
  const name = esc((v.firstName || '').trim() || 'there');
  const features: [string, string][] = [
    ['Brand Kit', 'save your tone, audience and product once, and every prompt uses them automatically.'],
    ['Run it', 'generate the final text right inside the app, ready to copy and use.'],
    ['14 expert packs', 'marketing, real estate, small business, freelancers, hospitality and more, in English and Portuguese.'],
    ['Learn', 'short practical lessons that make your prompts sharper in minutes.'],
    ['Cleaner workspace', 'Create, Library, Packs and Learn, all in one place.'],
  ];
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(A1_SUBJECT)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(A1_PREVIEW)}&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d24;">
<tr><td style="background:#14151b;padding:22px 32px;">
  <span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:8px;background:#f97316;color:#fff;font-weight:700;font-size:16px;vertical-align:middle;">P</span>
  <span style="font-size:18px;font-weight:700;color:#ffffff;vertical-align:middle;margin-left:8px;">Prompt<span style="color:#f97316;">Forge</span> Pro</span>
</td></tr>
<tr><td style="padding:32px 32px 8px;">
  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${name},</p>
  <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">PromptForge Pro has been rebuilt from the ground up, and you're one of the first people we're inviting back.</p>
  <p style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#f97316;">What's new</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  ${features.map(([t, d]) => `<tr><td valign="top" style="padding:0 10px 12px 0;width:18px;color:#f97316;font-size:16px;line-height:1.5;">&#10003;</td><td style="padding:0 0 12px;font-size:15px;line-height:1.5;"><strong>${esc(t)}:</strong> ${esc(d)}</td></tr>`).join('\n  ')}
  </table>
</td></tr>
<tr><td style="padding:8px 32px 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;">
  <tr><td style="padding:22px 24px;text-align:center;">
    <p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#c2410c;">Your early-access gift</p>
    <p style="margin:0 0 14px;font-size:16px;line-height:1.55;">Use code <strong style="font-family:Menlo,Consolas,monospace;font-size:17px;background:#ffffff;border:1px dashed #f97316;border-radius:6px;padding:2px 8px;">${A1_CODE}</strong> for <strong>50% off your first month of Pro</strong> in the next 24 hours.</p>
    <a href="${esc(v.claimUrl)}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:13px 26px;border-radius:10px;">Claim my discount &rarr;</a>
    <p style="margin:14px 0 0;font-size:13px;line-height:1.5;color:#6b6b76;">The code is personal to this invitation and expires on ${esc(v.expiresLisbon)}.</p>
  </td></tr></table>
</td></tr>
<tr><td style="padding:24px 32px 32px;">
  <p style="margin:0;font-size:16px;line-height:1.6;">See you inside,<br><strong>Nuno</strong>, PromptForge Pro</p>
</td></tr>
<tr><td style="padding:18px 32px;background:#fafafa;border-top:1px solid #eeeeef;font-size:12px;line-height:1.5;color:#8a8a94;">
  You're receiving this because you have a PromptForge Pro account. <a href="${esc(v.unsubscribeUrl)}" style="color:#8a8a94;text-decoration:underline;">Unsubscribe</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  const text = `Hi ${(v.firstName || '').trim() || 'there'},

PromptForge Pro has been rebuilt from the ground up, and you're one of the first people we're inviting back.

What's new:
${features.map(([t, d]) => `- ${t}: ${d}`).join('\n')}

Your early-access gift: use code ${A1_CODE} for 50% off your first month of Pro in the next 24 hours.

Claim my discount: ${v.claimUrl}

The code is personal to this invitation and expires on ${v.expiresLisbon}.

See you inside,
Nuno, PromptForge Pro

You're receiving this because you have a PromptForge Pro account. Unsubscribe: ${v.unsubscribeUrl}
`;
  return { subject: A1_SUBJECT, html, text };
}
