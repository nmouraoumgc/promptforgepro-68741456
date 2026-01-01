-- Drop the overly permissive policy that allows any authenticated user to read all profiles
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Drop existing restrictive SELECT policies (they need to be permissive for proper OR logic)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a single permissive SELECT policy that:
-- 1. Requires authentication (blocks anonymous)
-- 2. Only allows users to see their own profile OR admins to see all
CREATE POLICY "Users can view own profile or admins can view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role));