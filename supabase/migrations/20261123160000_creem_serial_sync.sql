begin;
create table public.creem_sync_leases (
  subscription_id text primary key,
  token uuid not null,
  expires_at timestamptz not null
);
alter table public.creem_sync_leases enable row level security;
revoke all on public.creem_sync_leases from public,anon,authenticated,service_role;

create function public.acquire_creem_sync(p_subscription text) returns uuid
language plpgsql security definer set search_path=public as $$
declare acquired uuid;
begin
  insert into creem_sync_leases values(p_subscription,gen_random_uuid(),clock_timestamp()+interval '60 seconds')
  on conflict(subscription_id) do update set token=excluded.token,expires_at=excluded.expires_at
    where creem_sync_leases.expires_at < clock_timestamp()
  returning token into acquired;
  return acquired;
end;
$$;
create or replace function public.apply_creem_subscription(
  p_request uuid, p_checkout text, p_subscription text, p_customer text, p_product text,
  p_env text, p_event_at bigint, p_status text, p_start timestamptz, p_end timestamptz, p_cancel boolean
) returns void language plpgsql set search_path = public as $$
declare
  binding creem_checkouts%rowtype;
  attempt checkout_attempts%rowtype;
begin
  if p_checkout is not null then
    select * into strict binding from creem_checkouts where attempt_id=p_request and checkout_id=p_checkout for update;
    if binding.subscription_id is not null and binding.subscription_id<>p_subscription then raise exception 'Subscription mismatch'; end if;
  else
    -- A subscription event can precede checkout.completed. A non-2xx response requests redelivery.
    select * into strict binding from creem_checkouts where subscription_id=p_subscription for update;
  end if;
  if binding.product_id<>p_product or binding.environment<>p_env then raise exception 'Product or environment mismatch'; end if;
  select * into strict attempt from checkout_attempts where id=binding.attempt_id;
  if p_checkout is not null and binding.subscription_id is null then
    update creem_checkouts set subscription_id=p_subscription,checkout_url=null where attempt_id=binding.attempt_id;
    update checkout_attempts set status='completed',updated_at=now() where id=binding.attempt_id;
  end if;
  insert into subscriptions(user_id,creem_subscription_id,creem_customer_id,product_id,price_id,status,
    current_period_start,current_period_end,cancel_at_period_end,environment,creem_event_at)
  values(attempt.user_id,p_subscription,p_customer,p_product,attempt.price_id,p_status,p_start,p_end,p_cancel,p_env,p_event_at)
  on conflict(creem_subscription_id) do update set status=excluded.status,current_period_start=excluded.current_period_start,
    current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,
    creem_event_at=excluded.creem_event_at,updated_at=now()
;
end;
$$;
create function public.commit_creem_sync(
 p_token uuid,p_request uuid,p_checkout text,p_subscription text,p_customer text,p_product text,
 p_env text,p_status text,p_start timestamptz,p_end timestamptz,p_cancel boolean
) returns void language plpgsql security definer set search_path=public as $$
begin
  perform 1 from creem_sync_leases where subscription_id=p_subscription and token=p_token
    and expires_at>clock_timestamp() for update;
  if not found then raise exception 'Expired or superseded Creem synchronization'; end if;
  perform apply_creem_subscription(p_request,p_checkout,p_subscription,p_customer,p_product,
    p_env,null,p_status,p_start,p_end,p_cancel);
  delete from creem_sync_leases where subscription_id=p_subscription and token=p_token;
end;
$$;
revoke all on function public.apply_creem_subscription(uuid,text,text,text,text,text,bigint,text,timestamptz,timestamptz,boolean) from service_role;
revoke all on function public.acquire_creem_sync(text),
 public.commit_creem_sync(uuid,uuid,text,text,text,text,text,text,timestamptz,timestamptz,boolean)
 from public,anon,authenticated;
grant execute on function public.acquire_creem_sync(text),
 public.commit_creem_sync(uuid,uuid,text,text,text,text,text,text,timestamptz,timestamptz,boolean)
 to service_role;
commit;
