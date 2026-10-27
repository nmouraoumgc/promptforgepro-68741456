-- Daily dunning cron (09:00 UTC). Key is read from Supabase Vault at run time
-- (secret name: dunning_cron_key, created out-of-band; never hardcode it here).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('dunning-cron-daily')
where exists (select 1 from cron.job where jobname = 'dunning-cron-daily');

select cron.schedule(
  'dunning-cron-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://cwrxbxxfaemcvliasycz.supabase.co/functions/v1/dunning-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'dunning_cron_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);
