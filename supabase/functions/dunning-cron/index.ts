import { createClient } from 'npm:@supabase/supabase-js@2';
import { isInternalCaller } from '../_shared/internalAuth.ts';

// Runs daily. Sends day3 and day6 dunning reminders for past_due subscriptions.
Deno.serve(async (req) => {
  if (!(await isInternalCaller(req))) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: subs } = await supabase
      .from('subscriptions')
      .select('paddle_subscription_id, user_id, updated_at')
      .eq('status', 'past_due');

    const results: any[] = [];
    const now = Date.now();
    for (const s of subs ?? []) {
      const ageDays = (now - new Date(s.updated_at as string).getTime()) / 86_400_000;
      let type: 'day3' | 'day6' | null = null;
      if (ageDays >= 6) type = 'day6';
      else if (ageDays >= 3) type = 'day3';
      if (!type) continue;

      const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-dunning-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          userId: s.user_id,
          subscriptionId: s.paddle_subscription_id,
          type,
        }),
      });
      const out = await res.json().catch(() => ({}));
      results.push({ sub: s.paddle_subscription_id, type, status: res.status, out });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('dunning-cron error', e);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
  }
});
