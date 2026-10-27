import { createClient } from 'npm:@supabase/supabase-js@2';
import { isInternalCaller } from '../_shared/internalAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ReminderType = 'initial' | 'day3' | 'day6';

const SUBJECTS_PT: Record<ReminderType, string> = {
  initial: 'Não conseguimos processar o teu pagamento — PromptForge Pro',
  day3: 'Lembrete: pagamento ainda em falha — PromptForge Pro',
  day6: 'Última oportunidade antes do cancelamento — PromptForge Pro',
};

const BODY_PT: Record<ReminderType, { headline: string; body: string }> = {
  initial: {
    headline: 'Não conseguimos cobrar o teu plano Pro',
    body: 'Tentámos processar a próxima cobrança mas o pagamento foi recusado. Vamos voltar a tentar automaticamente nos próximos dias. Para manteres o acesso Pro sem interrupção, atualiza o método de pagamento agora.',
  },
  day3: {
    headline: 'O pagamento continua sem ser aprovado',
    body: 'Já passaram alguns dias e ainda não conseguimos cobrar a tua subscrição Pro. Atualiza o cartão para evitares perder o acesso aos teus prompts, histórico e otimizações.',
  },
  day6: {
    headline: 'Última chamada antes do cancelamento',
    body: 'Esta é a nossa última notificação. Se o pagamento não for resolvido nos próximos dias, a subscrição vai ser cancelada automaticamente e perdes o acesso Pro.',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  if (!(await isInternalCaller(req))) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const { userId, subscriptionId, type } = await req.json() as {
      userId: string; subscriptionId: string; type: ReminderType;
    };
    if (!userId || !subscriptionId || !type) {
      return json({ error: 'missing params' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Idempotency check
    const { data: existing } = await supabase
      .from('dunning_notifications')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .eq('reminder_type', type)
      .maybeSingle();
    if (existing) {
      return json({ skipped: true, reason: 'already_sent' });
    }

    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();
    if (!profile?.email) return json({ error: 'no_email' }, 404);

    const subject = SUBJECTS_PT[type];
    const { headline, body } = BODY_PT[type];
    const portalUrl = 'https://promptforgepro.me/account';

    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#e5e5e5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;padding:32px;border:1px solid #222;">
            <tr><td>
              <h1 style="margin:0 0 8px;font-size:24px;color:#fff;">Prompt<span style="color:#f97316;">Forge</span></h1>
              <p style="margin:0 0 24px;color:#888;font-size:13px;">Cobrança Pro</p>
              <h2 style="margin:0 0 16px;font-size:20px;color:#fff;line-height:1.3;">${headline}</h2>
              <p style="margin:0 0 24px;color:#cfcfcf;font-size:15px;line-height:1.6;">${body}</p>
              <a href="${portalUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Atualizar método de pagamento</a>
              <p style="margin:32px 0 0;color:#666;font-size:12px;line-height:1.5;">Se já atualizaste o método de pagamento, ignora este email. Vamos voltar a tentar a cobrança automaticamente.</p>
            </td></tr>
          </table>
          <p style="color:#555;font-size:12px;margin:16px 0 0;">PromptForge · promptforgepro.me</p>
        </td></tr>
      </table>
    </body></html>`;

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) return json({ error: 'missing_config' }, 500);

    // Direct Resend API (previously via Lovable connector gateway)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM') ?? 'PromptForge <onboarding@resend.dev>',
        reply_to: Deno.env.get('RESEND_REPLY_TO') ?? 'geral@promptforgepro.me',
        to: [profile.email],
        subject,
        html,
      }),
    });
    const out = await res.json();
    if (!res.ok) {
      console.error('Resend error', out);
      return json({ error: 'send_failed', detail: out }, 502);
    }

    await supabase.from('dunning_notifications').insert({
      user_id: userId,
      subscription_id: subscriptionId,
      reminder_type: type,
    });

    return json({ sent: true });
  } catch (e) {
    console.error('send-dunning-email error', e);
    return json({ error: 'internal' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
