-- Read-only. Execute against production before approving deployment.
select version();
select version,name from supabase_migrations.schema_migrations order by version desc limit 15;
select column_name,udt_name,is_nullable from information_schema.columns
where table_schema='public' and table_name='subscriptions' order by ordinal_position;
select status,environment,count(*) from public.subscriptions group by 1,2;
select count(*) as active_paid_rights from public.subscriptions
where status in ('active','trialing','past_due','canceled')
and (current_period_end is null or current_period_end>now());
select p.oid::regprocedure,pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
('recompute_profile_plan','sync_profile_plan_from_subscription','reserve_creem_checkout','apply_creem_subscription');
select tgname,tgfoid::regprocedure from pg_trigger
where tgrelid='public.subscriptions'::regclass and not tgisinternal;
select extname from pg_extension where extname='pg_cron';
