-- Create a public view for profiles that excludes sensitive data (phone_number)
-- This view will be used when group members need to see each other's profiles
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  display_name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;

-- Update the RLS policy to restrict direct profile access
-- Drop the existing policy that allows group members to see full profiles
DROP POLICY IF EXISTS "Group members can view each other's profiles" ON public.profiles;

-- Create a new policy that only allows users to view their own full profile
-- Group members will use the profiles_public view instead
CREATE POLICY "Users can only view own full profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Note: The existing "Users can view own profile" policy is redundant now but harmless
-- We'll keep it for clarity