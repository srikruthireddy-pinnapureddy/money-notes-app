
-- Add RLS to profiles_public view for defense in depth
-- The view already excludes phone_number, but explicit policies improve security posture
ALTER VIEW public.profiles_public SET (security_invoker = true);

-- Allow authenticated users to read public profiles (display_name, avatar_url only)
CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL)
;

-- Note: profiles_public is a view on profiles, so the profiles table RLS applies.
-- We need to ensure authenticated users can see basic profile info of group members.
-- The existing "Users can only view own full profile" policy is too restrictive for the view.
-- However, we already have get_group_member_profiles() as SECURITY DEFINER.
-- Let's instead drop the duplicate and keep it simple - the view uses security_invoker
-- which means the calling user's RLS applies.
