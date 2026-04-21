
-- Drop overly broad SELECT policy on user_roles
DROP POLICY IF EXISTS "Block anonymous access to user_roles" ON public.user_roles;

-- Keep "Users can view their own roles" (already exists, scoped to authenticated + auth.uid() = user_id)
-- Keep "Admins can manage roles" (ALL, authenticated)

-- Tighten profiles UPDATE policy: scope to authenticated only and add WITH CHECK
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
