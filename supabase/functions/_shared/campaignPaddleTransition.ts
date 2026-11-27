// PADDLE_TRANSITION: one notice per Paddle trial account, about 48h before its free period ends.
// Paddle closed our seller account and confirmed in writing (24/11/2026) that these subscriptions
// pause at the next renewal without any charge. Access stays Pro until period end + 48h
// (expire-paddle-grace job), then the account can continue on Creem with PADDLE50.
// Bilingual (PT-PT first, EN below) because profiles have no language field. Pure function.
// Copy mirrored in /workspace/pfp/paddle_transition/email_draft.md. No em dashes in the copy.
export const PADDLE_TRANSITION_CAMPAIGN = 'PADDLE_TRANSITION';
export const PADDLE50_CODE = 'PADDLE50';
export const PADDLE_GRACE_HOURS = 48;
export const PADDLE_TRANSITION_SUBJECT = 'O teu acesso Pro e 50% no primeiro mês | Your Pro access and 50% off';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function lisbonDate(iso: string, lang: 'pt' | 'en'): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-PT' : 'en-GB', { timeZone: 'Europe/Lisbon', day: 'numeric', month: 'long' }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return lang === 'pt' ? `${date}, às ${time} (hora de Lisboa)` : `${date} at ${time} (Lisbon time)`;
}

export function graceEnd(periodEndIso: string): string {
  return new Date(Date.parse(periodEndIso) + PADDLE_GRACE_HOURS * 3600_000).toISOString();
}

export function paddleTransitionCopy(periodEndIso: string) {
  const endPt = lisbonDate(periodEndIso, 'pt'), endEn = lisbonDate(periodEndIso, 'en');
  const g = graceEnd(periodEndIso);
  const gracePt = lisbonDate(g, 'pt'), graceEn = lisbonDate(g, 'en');
  const pt = [
    'Olá,',
    `Obrigado por teres experimentado o PromptForge Pro. O teu mês grátis termina a ${endPt}.`,
    'Mudámos de sistema de pagamentos e o Paddle deixou de processar os nossos pagamentos. Por isso, o Paddle não te vai cobrar nada e não precisas de cancelar nada.',
    `Para teres tempo de decidir com calma, o teu acesso Pro mantém-se até ${gracePt}.`,
    `Se quiseres continuar, a partir dessa hora podes subscrever através da Creem, o nosso novo sistema de pagamentos, com 50% de desconto no primeiro mês: pagas 4,50 € em vez de 9 € com o código ${PADDLE50_CODE}. Depois são 9 € por mês e cancelas quando quiseres. O código é válido até 31 de dezembro de 2026.`,
    'Se tiveres alguma dúvida, responde a este email. Leio todas as respostas.',
  ];
  const en = [
    'Hi there,',
    `Thanks for trying PromptForge Pro. Your free month ends on ${endEn}.`,
    'We have changed payment provider and Paddle no longer processes our payments. So Paddle will not charge you anything, and there is nothing you need to cancel.',
    `To give you time to decide, your Pro access stays on until ${graceEn}.`,
    `If you want to keep going, from then on you can subscribe through Creem, our new payment provider, with 50% off your first month: €4.50 instead of €9 with the code ${PADDLE50_CODE}. After that it is €9 per month and you can cancel any time. The code is valid until 31 December 2026.`,
    'Any questions? Just reply to this email. I read every reply.',
  ];
  return { pt, en, ctaPt: 'Continuar com 50% de desconto', ctaEn: 'Continue with 50% off', sign: 'Nuno, PromptForge Pro' };
}

export function renderPaddleTransition(v: { periodEnd: string; claimUrl: string; unsubscribeUrl: string }): { subject: string; html: string; text: string } {
  const c = paddleTransitionCopy(v.periodEnd);
  const claim = esc(v.claimUrl), unsub = esc(v.unsubscribeUrl);
  const p = (t: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${esc(t)}</p>`;
  const button = (label: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto 20px;"><tr><td align="center" style="border-radius:10px;background:#f97316;">
    <a href="${claim}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">${esc(label)} &rarr;</a></td></tr></table>`;
  const codeBox = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr><td align="center" style="background:#fff7ed;border:2px dashed #f97316;border-radius:10px;padding:14px;">
    <div style="font-size:24px;font-weight:800;letter-spacing:.08em;color:#14151b;">${PADDLE50_CODE}</div>
    <div style="font-size:14px;color:#374151;margin-top:4px;">50% · 1.º mês / first month · Pro mensal / monthly</div></td></tr></table>`;
  const section = (lines: string[], cta: string) => lines.slice(0, 5).map(p).join('\n') + codeBox + button(cta) + p(lines[5]) + p(c.sign);
  const html = `<!doctype html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(PADDLE_TRANSITION_SUBJECT)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">O Paddle não te vai cobrar nada. Paddle will not charge you anything.&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
<tr><td style="background:#14151b;padding:22px 32px;">
  <span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:8px;background:#f97316;color:#fff;font-weight:700;font-size:16px;vertical-align:middle;">P</span>
  <span style="font-size:18px;font-weight:700;color:#ffffff;vertical-align:middle;margin-left:8px;">Prompt<span style="color:#f97316;">Forge</span> Pro</span>
</td></tr>
<tr><td style="padding:28px 32px 8px;">
  <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">Português · <a href="#en" style="color:#6b7280;">English below</a></p>
${section(c.pt, c.ctaPt)}
</td></tr>
<tr><td id="en" style="padding:20px 32px 8px;border-top:1px solid #eee;" lang="en">
${section(c.en, c.ctaEn)}
</td></tr>
<tr><td style="padding:18px 32px 26px;border-top:1px solid #eee;font-size:12px;line-height:1.6;color:#6b7280;">
  Recebes este email porque tinhas uma subscrição PromptForge Pro através do Paddle. / You are receiving this because you had a PromptForge Pro subscription through Paddle.<br>
  <a href="${unsub}" style="color:#6b7280;">Cancelar subscrição de emails / Unsubscribe</a> &middot; <a href="https://promptforgepro.me" style="color:#6b7280;">promptforgepro.me</a>
</td></tr>
</table>
</td></tr></table>
</body></html>
`;
  const block = (lines: string[], cta: string) => [...lines.slice(0, 5), `Código / Code: ${PADDLE50_CODE}`, `${cta}: ${v.claimUrl}`, lines[5], c.sign].join('\n\n');
  const text = `${block(c.pt, c.ctaPt)}

----

${block(c.en, c.ctaEn)}

Recebes este email porque tinhas uma subscrição PromptForge Pro através do Paddle. / You are receiving this because you had a PromptForge Pro subscription through Paddle.
Cancelar subscrição de emails / Unsubscribe: ${v.unsubscribeUrl}
`;
  return { subject: PADDLE_TRANSITION_SUBJECT, html, text };
}
