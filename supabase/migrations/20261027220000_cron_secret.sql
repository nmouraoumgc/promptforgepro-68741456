-- Random cron secret kept in Vault (generated server-side, never in source).
select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'), 'cron_secret', 'Shared secret for dunning-cron / send-dunning-email')
where not exists (select 1 from vault.secrets where name = 'cron_secret');

create or replace function public.verify_cron_secret(p_secret text) returns boolean
language sql security definer set search_path = public, vault as $$
  select coalesce(length(p_secret) >= 32 and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), false);
$$;
revoke all on function public.verify_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_cron_secret(text) to service_role;

select cron.unschedule('dunning-cron-daily') where exists (select 1 from cron.job where jobname = 'dunning-cron-daily');
select cron.schedule('dunning-cron-daily', '0 9 * * *', $$
  select net.http_post(
    url := 'https://cwrxbxxfaemcvliasycz.supabase.co/functions/v1/dunning-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'dunning_cron_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb, timeout_milliseconds := 30000) as request_id;
$$);
