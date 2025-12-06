-- Drop the existing SELECT policy that exposes phone numbers to all group members
DROP POLICY IF EXISTS "Users can view own profile or shared group members" ON public.profiles;

-- Create new policy: Users can only directly view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Create a secure function to get group member profiles (without sensitive data like phone_number)
CREATE OR REPLACE FUNCTION public.get_group_member_profiles(group_id_param uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id,
    p.display_name,
    p.avatar_url
  FROM profiles p
  JOIN group_members gm ON gm.user_id = p.id
  WHERE gm.group_id = group_id_param
    AND is_group_member(auth.uid(), group_id_param);
$$;