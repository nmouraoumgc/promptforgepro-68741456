-- Run read-only in the SQL Editor of project nzhjzdmuevwsaldpqlxd.
select tablename from pg_tables where schemaname = 'public' order by tablename;
select count(*) as auth_users from auth.users;
select extname from pg_extension where extname in ('pg_cron','pg_net');
select to_regclass('supabase_migrations.schema_migrations') as migration_history,
       to_regnamespace('creem_qa_bootstrap_v1') as bootstrap_marker;
select table_name, column_name, udt_schema, udt_name, is_nullable, column_default is not null as has_default
from information_schema.columns
where table_schema = 'public' and table_name in ('profiles','user_roles')
order by table_name, ordinal_position;

-- Review custom triggers before creating a sandbox user or running a payment.
-- Show the function name without exposing its body or settings.
select n.nspname as schema_name, c.relname as table_name,
       t.tgname as trigger_name, t.tgfoid::regprocedure as handler
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal and t.tgenabled <> 'D'
  and ((n.nspname = 'auth' and c.relname = 'users')
    or (n.nspname = 'public' and c.relname in ('profiles','user_roles','subscriptions','creem_checkouts')))
order by 1,2,3;
