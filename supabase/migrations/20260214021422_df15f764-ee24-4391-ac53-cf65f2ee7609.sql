
-- Remove the overly permissive policy we just added
DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON public.profiles;

-- Instead, create a policy that allows authenticated users to see 
-- only the non-sensitive columns via the profiles_public view.
-- Since profiles_public uses security_invoker = true, the RLS on profiles applies.
-- We need a policy that allows reading id, display_name, avatar_url for group members.
-- The shares_group_with function already handles this check.
CREATE POLICY "Users can view profiles of group members"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR public.shares_group_with(auth.uid(), id)
);

-- Drop the old duplicate policies
DROP POLICY IF EXISTS "Users can only view own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
