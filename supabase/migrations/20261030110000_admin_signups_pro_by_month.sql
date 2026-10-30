-- Exact monthly signups and how many of each month's signups are Pro, for the admin dashboard.
-- Pro = profile flag current_plan = 'pro' OR an active/trialing subscription (same notion the dashboard uses).
-- Only callable with the service role (used by the admin-only admin-metrics edge function).
create or replace function public.admin_signups_pro_by_month(p_months int default 6, p_tz text default 'Europe/Lisbon')
returns table (month text, signups bigint, pro bigint)
language sql
stable
security definer
set search_path = public
as $$
  with m as (
    select (date_trunc('month', now() at time zone p_tz) - make_interval(months => g))::timestamp as start_local
    from generate_series(greatest(p_months, 1) - 1, 0, -1) g
  )
  select to_char(m.start_local, 'YYYY-MM') as month,
         count(p.id) as signups,
         count(p.id) filter (
           where p.current_plan = 'pro'
              or exists (select 1 from public.subscriptions s where s.user_id = p.id and s.status in ('active', 'trialing'))
         ) as pro
  from m
  left join public.profiles p
    on p.created_at >= (m.start_local at time zone p_tz)
   and p.created_at <  ((m.start_local + interval '1 month') at time zone p_tz)
  group by m.start_local
  order by m.start_local;
$$;

revoke all on function public.admin_signups_pro_by_month(int, text) from public, anon, authenticated;
grant execute on function public.admin_signups_pro_by_month(int, text) to service_role;
