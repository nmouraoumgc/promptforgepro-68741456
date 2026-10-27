-- Prompt packs are the one-time "premium" product (Pricing page, PLAN_LIMITS.canAccessPromptPacks).
-- Non-free pack prompts are readable only by premium users and admins; free previews stay public.
drop policy if exists "View free prompts or purchased premium prompts" on public.pack_prompts;
create policy "View free prompts or purchased premium prompts"
on public.pack_prompts for select
using (
  exists (select 1 from public.prompt_packs pk where pk.id = pack_prompts.pack_id and pk.is_active = true)
  and (
    is_free_preview = true
    or (
      auth.uid() is not null
      and (
        exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.current_plan = 'premium'::plan_type)
        or public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  )
);
