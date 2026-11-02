# Builds the ONEHACK100 reminder drafts (same brand layout as ../activation_email/build.py). Nothing is sent.
# Placeholders: {{SEND_ID}} (campaign_sends.id, campaign or batch = ONEHACK_REMIND), {{UNSUBSCRIBE_URL}}, {{USES_LEFT}} (re-read from Paddle right before sending; 27 on 1 Nov 2026).
import html
URL='https://promptforgepro.me/pricing?code=ONEHACK100&lang={l}&c=ONEHACK_REMIND&r={{{{SEND_ID}}}}'
OFFER={
 'en':dict(t='Your OneHack offer', rows=[('Code','ONEHACK100'),('What you get','1 month of Pro, 100% off'),('Due today','€0 / $0'),('Codes left','{{USES_LEFT}} of 50'),('Valid until','28 Nov 2026, 13:00 Lisbon time, or until the codes run out')]),
 'pt':dict(t='A tua oferta OneHack', rows=[('Código','ONEHACK100'),('O que recebes','1 mês de Pro, 100% de desconto'),('A pagar hoje','0 €'),('Códigos restantes','{{USES_LEFT}} de 50'),('Válido até','28 nov 2026, 13:00 (hora de Lisboa), ou até acabarem os códigos')]),
}
C={
 ('en','main'):dict(lang='en',subject='Your free month of Pro is still waiting',subject_b='ONEHACK100 still works: 1 month of Pro, free',
  pre='{{USES_LEFT}} of 50 OneHack codes left, valid until 28 Nov. €0 today, cancel anytime.',
  hi='Hi there,',
  paras=["You signed up for PromptForge Pro through the OneHack post, and your free month of Pro is still unclaimed. Good news: the code still works.",
         "The button below opens Pricing with ONEHACK100 already applied. Choose Pro, continue to payment, and Paddle shows €0.00 due today. Pro is active straight away."],
  tip=None, cta='Claim my free month', cta_url=URL.format(l='en'),
  small="Paddle asks for a card or PayPal to start the subscription, but nothing is charged today. After the free month it renews at €9/month ($9 in some countries) unless you cancel, which you can do anytime from your Account page.",
  then="If anything gets in the way, just reply to this email. I read every reply.",
  sign='Nuno, PromptForge Pro', foot="You're receiving this because you signed up for PromptForge Pro through the OneHack post.", unsub='Unsubscribe'),
 ('en','failed'):dict(lang='en',subject='Something went wrong with your free month. Try again?',subject_b='Your ONEHACK100 code is still yours to use',
  pre="Your last checkout didn't go through. Nothing was charged and the code still works.",
  hi='Hi there,',
  paras=["You tried to claim your free month of Pro with ONEHACK100, but the checkout didn't go through. Sorry about that. Nothing was charged and the code was not used, so you can try again."],
  tip=('Why it usually fails',"To start the subscription, Paddle checks your card with a €0 verification, and some banks decline it or ask for extra confirmation. What helps:",
       ['Try another card, or PayPal.','Turn on online (and international) payments in your banking app.','Approve the 3D Secure request from your bank when it pops up.']),
  cta='Try again', cta_url=URL.format(l='en'),
  small="The button opens Pricing with the code already applied, and Paddle shows €0.00 due today. After the free month Pro renews at €9/month ($9 in some countries) unless you cancel, which you can do anytime from your Account page.",
  then="Still stuck? Just reply to this email and I'll help you sort it out.",
  sign='Nuno, PromptForge Pro', foot="You're receiving this because you signed up for PromptForge Pro through the OneHack post.", unsub='Unsubscribe'),
 ('pt','main'):dict(lang='pt-PT',subject='O teu mês grátis de Pro ainda está à tua espera',subject_b='O ONEHACK100 ainda funciona: 1 mês de Pro grátis',
  pre='Restam {{USES_LEFT}} de 50 códigos OneHack, válidos até 28 nov. 0 € hoje, cancelas quando quiseres.',
  hi='Olá,',
  paras=['Registaste-te no PromptForge Pro através do post na OneHack e ainda não usaste o teu mês grátis de Pro. Boa notícia: o código ainda funciona.',
         'O botão abaixo abre a página de preços com o ONEHACK100 já aplicado. Escolhe Pro, continua para o pagamento e o Paddle mostra 0,00 € a pagar hoje. O Pro fica ativo de imediato.'],
  tip=None, cta='Ativar o meu mês grátis', cta_url=URL.format(l='pt'),
  small='O Paddle pede um cartão ou PayPal para iniciar a subscrição, mas hoje não é cobrado nada. Depois do mês grátis renova a 9 €/mês, a não ser que canceles, o que podes fazer a qualquer momento na página Conta.',
  then='Se alguma coisa falhar, responde a este email. Leio todas as respostas.',
  sign='Nuno, PromptForge Pro', foot='Recebes este email porque te registaste no PromptForge Pro através do post na OneHack.', unsub='Cancelar subscrição'),
 ('pt','failed'):dict(lang='pt-PT',subject='Algo correu mal com o teu mês grátis. Tentas outra vez?',subject_b='O teu código ONEHACK100 continua disponível',
  pre='O último checkout não foi concluído. Não foi cobrado nada e o código continua válido.',
  hi='Olá,',
  paras=['Tentaste ativar o teu mês grátis de Pro com o ONEHACK100, mas o checkout não foi concluído. Pedimos desculpa. Não foi cobrado nada e o código não foi gasto, por isso podes tentar outra vez.'],
  tip=('Porque é que costuma falhar','Para iniciar a subscrição, o Paddle valida o cartão com uma verificação de 0 €, e alguns bancos recusam-na ou pedem confirmação extra. O que ajuda:',
       ['Experimenta outro cartão, ou PayPal.','Ativa os pagamentos online (e internacionais) na app do teu banco.','Aprova o pedido de 3D Secure do banco quando aparecer.']),
  cta='Tentar outra vez', cta_url=URL.format(l='pt'),
  small='O botão abre a página de preços com o código já aplicado, e o Paddle mostra 0,00 € a pagar hoje. Depois do mês grátis o Pro renova a 9 €/mês, a não ser que canceles, o que podes fazer a qualquer momento na página Conta.',
  then='Continua a não dar? Responde a este email e eu ajudo-te a resolver.',
  sign='Nuno, PromptForge Pro', foot='Recebes este email porque te registaste no PromptForge Pro através do post na OneHack.', unsub='Cancelar subscrição'),
}
e=html.escape
P='<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">{}</p>'
for (lg,var),c in C.items():
    assert '—' not in str(c) and '–' not in str(c)
    o=OFFER[lg]
    offer=(f'''<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr><td style="background:#fff7ed;border:1px dashed #f97316;border-radius:10px;padding:14px 16px;">
  <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#c2410c;margin-bottom:8px;">{e(o['t'])}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">'''+''.join(
     f'<tr><td valign="top" style="padding:3px 12px 3px 0;font-size:14px;color:#6b7280;white-space:nowrap;">{e(k)}</td><td style="padding:3px 0;font-size:14px;line-height:1.5;color:#14151b;'+('font-family:Menlo,Consolas,monospace;font-weight:700;' if i==0 else '')+f'">{e(v)}</td></tr>' for i,(k,v) in enumerate(o['rows']))+'</table></td></tr></table>')
    tip=''
    if c['tip']:
        tt,ti,tl=c['tip']
        tip=(f'''<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="background:#f9fafb;border-left:3px solid #f97316;border-radius:6px;padding:12px 16px;">
  <div style="font-size:14px;font-weight:700;color:#14151b;margin-bottom:6px;">{e(tt)}</div>
  <div style="font-size:14px;line-height:1.55;color:#374151;margin-bottom:6px;">{e(ti)}</div>
  <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:#374151;">'''+''.join(f'<li>{e(x)}</li>' for x in tl)+'</ul></td></tr></table>')
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
  {P.format(e(c['hi']))}
  {''.join(P.format(e(x)) for x in c['paras'])}
  {tip}
  {offer}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto 20px;"><tr><td align="center" style="border-radius:10px;background:#f97316;">
    <a href="{e(c['cta_url'])}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">{e(c['cta'])} &rarr;</a>
  </td></tr></table>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">{e(c['small'])}</p>
  {P.format(e(c['then']))}
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
    tiptxt=''
    if c['tip']:
        tt,ti,tl=c['tip']; tiptxt=f"{tt}\n{ti}\n"+'\n'.join('- '+x for x in tl)+'\n\n'
    offtxt=o['t']+'\n'+'\n'.join(f'- {k}: {v}' for k,v in o['rows'])
    body=f"{c['hi']}\n\n"+'\n\n'.join(c['paras'])+f"\n\n{tiptxt}{offtxt}\n\n{c['cta']}: {c['cta_url']}\n\n{c['small']}\n\n{c['then']}\n\n{c['sign']}\n\n{c['foot']} {c['unsub']}: {{{{UNSUBSCRIBE_URL}}}}\n"
    n=f'reminder_{lg}_{var}'
    open(n+'.html','w').write(h)
    open(n+'.txt','w').write(f"Subject A: {c['subject']}\nSubject B: {c['subject_b']}\nPreheader: {c['pre']}\n---\n"+body)
    open(n+'_preview.html','w').write(h.replace('{{SEND_ID}}','00000000-0000-0000-0000-000000000000').replace('{{UNSUBSCRIBE_URL}}','https://promptforgepro.me/unsubscribe?t=preview').replace('{{USES_LEFT}}','27'))
