-- Update the get_group_member_profiles function to use the profiles_public view
-- This ensures phone_number is never exposed even if RLS is bypassed
CREATE OR REPLACE FUNCTION public.get_group_member_profiles(group_id_param uuid)
RETURNS TABLE(id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id,
    p.display_name,
    p.avatar_url
  FROM profiles_public p
  JOIN group_members gm ON gm.user_id = p.id
  WHERE gm.group_id = group_id_param
    AND is_group_member(auth.uid(), group_id_param);
$$;