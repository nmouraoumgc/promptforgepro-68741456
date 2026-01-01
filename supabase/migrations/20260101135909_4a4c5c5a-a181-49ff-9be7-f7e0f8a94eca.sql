-- Update the pack_prompts SELECT policy to restrict premium content to users who purchased the pack
DROP POLICY IF EXISTS "Anyone can view prompts in active packs" ON public.pack_prompts;

-- Create policy that allows viewing:
-- 1. Free preview prompts (available to everyone)
-- 2. Premium prompts only if user has purchased the pack (or is admin)
CREATE POLICY "View free prompts or purchased premium prompts"
ON public.pack_prompts
FOR SELECT
USING (
  -- Check if pack is active first
  EXISTS (
    SELECT 1 FROM public.prompt_packs 
    WHERE prompt_packs.id = pack_prompts.pack_id 
    AND prompt_packs.is_active = true
  )
  AND (
    -- Free preview prompts are visible to everyone
    is_free_preview = true
    -- Premium prompts require authentication AND (purchase OR admin)
    OR (
      auth.uid() IS NOT NULL 
      AND (
        -- User has purchased a premium plan
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.current_plan IN ('pro', 'premium')
        )
        -- Or user is admin
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  )
);