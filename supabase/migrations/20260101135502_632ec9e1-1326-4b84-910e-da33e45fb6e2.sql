-- Add permissive policy to block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- Add permissive policy to block anonymous access to user_roles table
CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);