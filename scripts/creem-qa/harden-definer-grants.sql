-- Apply only in Supabase QA project nzhjzdmuevwsaldpqlxd after bootstrap v1.
begin;

do $qa_grants$
begin
  if to_regnamespace('creem_qa_bootstrap_v1') is null then
    raise exception 'QA grant hardening refused: bootstrap marker is missing';
  end if;
end;
$qa_grants$;

-- Authenticated purchase policies call this function. Keep their access and
-- the explicit service role grant after revoking the implicit PUBLIC grant.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

-- The existing trigger does not require client roles to execute its function.
revoke execute on function public.qa_create_profile() from public, anon, authenticated;

-- is_disposable_email(text) is also called by the logged-out signup UI.
-- Retain its existing explicit anon, authenticated and service_role grants.
commit;
