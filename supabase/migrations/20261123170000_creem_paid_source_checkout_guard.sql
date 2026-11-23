begin;
create or replace function public.reserve_creem_checkout(
  p_user uuid, p_email text, p_hash text, p_price text, p_product text, p_environment text, p_code text
) returns jsonb language plpgsql set search_path = public as $$
declare
  attempt uuid;
  since_time timestamptz := now() - interval '24 hours';
  blocked boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_hash, 1));
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 2));
  -- Check paid sources as well as the profile cache before creating a new charge.
  if exists (
    select 1 from subscriptions where user_id=p_user
      and (status in ('active','trialing','past_due') and (current_period_end is null or current_period_end>now())
        or status='canceled' and current_period_end>now())
  ) then return jsonb_build_object('reason','already_subscribed'); end if;
  if exists (select 1 from profiles where id = p_user and current_plan in ('pro','premium')) then
    return jsonb_build_object('reason','already_subscribed');
  end if;
  if public.is_disposable_email(p_email) then return jsonb_build_object('reason','disposable_email'); end if;
  -- Some installations also have the separate buyer-blocklist migration.
  if to_regprocedure('public.is_checkout_buyer_blocked(text,uuid,text)') is not null then
    select public.is_checkout_buyer_blocked(p_email,p_user,p_environment) into blocked;
    if blocked then return jsonb_build_object('reason','buyer_blocked'); end if;
  end if;
  if p_code is not null and exists (
    select 1 from checkout_attempts where user_id=p_user and discount_code=p_code and status='completed'
  ) then return jsonb_build_object('reason','code_already_used'); end if;
  if (select count(*) from checkout_attempts where user_id=p_user and status='failed' and created_at>=since_time)>=3
    or exists (select 1 from payment_failures where user_id=p_user and created_at>=since_time group by source having count(*)>=3)
    or (select count(*) from checkout_events where user_id=p_user and event_name in ('checkout.payment.failed','checkout.payment.error') and created_at>=since_time)>=3
  then return jsonb_build_object('reason','too_many_attempts'); end if;
  if exists (select 1 from payment_failures where ip_hash=p_hash and created_at>=since_time group by source having count(*)>=5)
  then return jsonb_build_object('reason','too_many_attempts_ip'); end if;

  if exists (
    select 1 from checkout_attempts a join creem_checkouts c on c.attempt_id=a.id
    where a.user_id=p_user and a.status in ('initiated','abandoned')
      and (a.status='abandoned' or c.product_id<>p_product or c.environment<>p_environment
        or a.discount_code is distinct from p_code)
  ) then return jsonb_build_object('reason','checkout_unavailable'); end if;

  select a.id into attempt from checkout_attempts a join creem_checkouts c on c.attempt_id=a.id
    where a.user_id=p_user and a.status='initiated' and c.product_id=p_product and c.environment=p_environment
      and a.discount_code is not distinct from p_code
    order by a.created_at desc limit 1;
  if attempt is not null then
    return (select jsonb_build_object('existing',true,'url',checkout_url) from creem_checkouts where attempt_id=attempt);
  end if;
  if (select count(*) from checkout_attempts where ip_hash=p_hash and status<>'blocked' and created_at>=since_time)>=5
  then return jsonb_build_object('reason','too_many_attempts_ip'); end if;
  insert into checkout_attempts(user_id,email,ip_hash,price_id,discount_code)
    values(p_user,p_email,p_hash,p_price,p_code) returning id into attempt;
  insert into creem_checkouts(attempt_id,product_id,environment) values(attempt,p_product,p_environment);
  return jsonb_build_object('attempt',attempt);
end;
$$;


commit;
