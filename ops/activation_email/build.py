import html, json
from urllib.parse import quote
EN_PROMPT='Write a short email to a client asking them to pay an overdue invoice. Keep it polite.'
PT_PROMPT='Escreve um email curto a um cliente a pedir que pague uma fatura em atraso. Mantém um tom educado.'
C = {
 'en': dict(
  lang='en', subject='Your first optimised prompt takes 60 seconds', 
  pre='The example prompt is already in the box. Press Optimise, see your score and run it. Free, no card needed.',
  hi='Hi there,',
  intro="You created a PromptForge Pro account but haven't tried it yet. Here is the quickest way to see what it does, in under a minute:",
  steps=['Open the optimiser with the button below (sign in if asked).', 'This example prompt is already in the box for you, no copying needed (edit it if you like):',
         'Press <strong>Optimise prompt</strong>. You get a score out of 100 and improved versions.',
         'Choose <strong>Detailed</strong> and press <strong>Run</strong>. The finished email appears right there, ready to copy.'],
  label='Example prompt',
  prompt=EN_PROMPT,
  cta='Optimise my first prompt', cta_url='https://promptforgepro.me/create?mode=optimize&lang=en&prompt='+quote(EN_PROMPT, safe='')+'&c=ACTIVATION1&r={{SEND_ID}}',
  free='This is part of your Free plan, no card needed (3 optimisations per prompt, 5 runs per day).',
  then="Once you've seen it work, try it with a prompt of your own. If anything gets in the way, just reply to this email. I read every reply.",
  sign='Nuno, PromptForge Pro',
  foot="You're receiving this because you have a PromptForge Pro account.", unsub='Unsubscribe'),
 'pt': dict(
  lang='pt-PT', subject='O teu primeiro prompt otimizado em 60 segundos', 
  pre='O prompt de exemplo já está na caixa. Carrega em Otimizar, vê a pontuação e executa. Grátis, sem cartão.',
  hi='Olá,',
  intro='Criaste uma conta no PromptForge Pro, mas ainda não o experimentaste. Este é o caminho mais rápido para veres o que faz, em menos de um minuto:',
  steps=['Abre o otimizador no botão abaixo (inicia sessão se for pedido).', 'Este prompt de exemplo já está na caixa, não precisas de copiar nada (podes editá-lo):',
         'Carrega em <strong>Otimizar prompt</strong>. Recebes uma pontuação de 0 a 100 e versões melhoradas.',
         'Escolhe <strong>Detalhado</strong> e carrega em <strong>Executar</strong>. O email final aparece logo ali, pronto a copiar.'],
  label='Prompt de exemplo',
  prompt=PT_PROMPT,
  cta='Otimizar o meu primeiro prompt', cta_url='https://promptforgepro.me/create?mode=optimize&lang=pt&prompt='+quote(PT_PROMPT, safe='')+'&c=ACTIVATION1&r={{SEND_ID}}',
  free='Está incluído no teu plano Free, sem cartão (3 otimizações por prompt, 5 execuções por dia).',
  then='Depois de veres o resultado, experimenta com um prompt teu. Se alguma coisa falhar, responde a este email. Leio todas as respostas.',
  sign='Nuno, PromptForge Pro',
  foot='Recebes este email porque tens uma conta no PromptForge Pro.', unsub='Cancelar subscrição'),
}
strip = lambda s: s.replace('<strong>','').replace('</strong>','')
for k,c in C.items():
    e=html.escape
    steps=''.join(
      f'<tr><td valign="top" style="padding:0 12px 12px 0;width:26px;"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:12px;background:#f97316;color:#ffffff;font-size:13px;font-weight:700;">{i+1}</span></td><td style="padding:2px 0 12px;font-size:15px;line-height:1.55;">{s}'
      + (f'''<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 2px;"><tr><td style="background:#fff7ed;border:1px dashed #f97316;border-radius:10px;padding:14px 16px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#c2410c;margin-bottom:6px;">{e(c['label'])}</div>
      <div style="font-family:Menlo,Consolas,monospace;font-size:14px;line-height:1.55;color:#14151b;">{e(c['prompt'])}</div></td></tr></table>''' if i==1 else '')
      + '</td></tr>' for i,s in enumerate(c['steps']))
    h=f'''<!doctype html>
<html lang="{c['lang']}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>{e(c['subject'])}</title></head>
<body style="margin:0;padding:0;background:#f4f4f6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{e(c['pre'])}&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
<tr><td style="background:#14151b;padding:22px 32px;">
  <span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:8px;background:#f97316;color:#fff;font-weight:700;font-size:16px;vertical-align:middle;">P</span>
  <span style="font-size:18px;font-weight:700;color:#ffffff;vertical-align:middle;margin-left:8px;">Prompt<span style="color:#f97316;">Forge</span> Pro</span>
</td></tr>
<tr><td style="padding:32px 32px 8px;">
  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">{e(c['hi'])}</p>
  <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">{e(c['intro'])}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
  {steps}
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto 20px;"><tr><td align="center" style="border-radius:10px;background:#f97316;">
    <a href="{e(c['cta_url'])}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">{e(c['cta'])} &rarr;</a>
  </td></tr></table>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">{e(c['free'])}</p>
  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">{e(c['then'])}</p>
  <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">{e(c['sign'])}</p>
</td></tr>
<tr><td style="padding:18px 32px 26px;border-top:1px solid #eee;font-size:12px;line-height:1.6;color:#6b7280;">
  {e(c['foot'])}<br>
  <a href="{{{{UNSUBSCRIBE_URL}}}}" style="color:#6b7280;">{e(c['unsub'])}</a> &middot; <a href="https://promptforgepro.me" style="color:#6b7280;">promptforgepro.me</a>
</td></tr>
</table>
</td></tr></table>
</body></html>
'''
    st='\n'.join(f'{i+1}. {strip(s)}' + (f'\n\n   {c["prompt"]}\n' if i==1 else '') for i,s in enumerate(c['steps']))
    t=f'''{c['hi']}

{c['intro']}

{st}

{c['cta']}: {c['cta_url']}

{c['free']}

{c['then']}

{c['sign']}

{c['foot']} {c['unsub']}: {{{{UNSUBSCRIBE_URL}}}}
'''
    open(f'activation_{k}.html','w').write(h)
    open(f'activation_{k}.txt','w').write(f"Subject: {c['subject']}\nPreheader: {c['pre']}\n---\n"+t)
    open(f'activation_{k}_preview.html','w').write(h.replace('{{SEND_ID}}','00000000-0000-0000-0000-000000000000').replace('{{UNSUBSCRIBE_URL}}','https://promptforgepro.me/unsubscribe?t=preview'))

# Edge function template (EN), generated from the same copy: supabase/functions/_shared/campaignActivation.ts
import re
c=C['en']; out=[]
for k in ['en']:
    pass
h=open('activation_en.html').read(); t=open('activation_en.txt').read().split('---\n',1)[1]
def ts(x):
    x=x.replace('\\','\\\\').replace('`','\\`').replace('${','\\${')
    return x.replace('{{SEND_ID}}','${sendId}')
h_ts=ts(h).replace('href="{{UNSUBSCRIBE_URL}}"','href="${unsubHtml}"')
t_ts=ts(t).replace('{{UNSUBSCRIBE_URL}}','${v.unsubscribeUrl}')
mod=f"""// ACTIVATION1 email (EN): free users with 0 runs, CTA opens the optimiser with the example prompt prefilled
// (/create?mode=optimize&prompt=...). GENERATED by /workspace/pfp/activation_email/build.py, do not edit by hand.
export const ACTIVATION_KEY = 'ACTIVATION1';
export const ACTIVATION_SUBJECT = {json.dumps(c['subject'])};

export function renderActivation(v: {{ sendId: string; unsubscribeUrl: string }}): {{ subject: string; html: string; text: string }} {{
  const sendId = encodeURIComponent(v.sendId);
  const unsubHtml = v.unsubscribeUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `{h_ts}`;
  const text = `{t_ts}`;
  return {{ subject: ACTIVATION_SUBJECT, html, text }};
}}
"""
open('/workspace/pfp/app/supabase/functions/_shared/campaignActivation.ts','w').write(mod)
