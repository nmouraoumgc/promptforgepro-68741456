-- Execute manually in the SQL Editor of QA project nzhjzdmuevwsaldpqlxd.
begin;

do $qa_expire$
begin
  if to_regnamespace('creem_qa_bootstrap_v1') is null then
    raise exception 'QA expiry refused: bootstrap marker is missing';
  end if;
end;
$qa_expire$;

with expired as (
  update public.subscriptions
     set status = 'expired', updated_at = now()
   where environment = 'sandbox'
     and creem_subscription_id is not null
     and current_period_end <= now()
     and status in ('active','past_due','canceled')
   returning 1
)
select count(*) as expired_subscriptions from expired;

commit;
