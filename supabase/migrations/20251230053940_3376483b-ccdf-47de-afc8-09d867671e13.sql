-- Add RLS policy to allow group members to view each other's profiles
-- This uses the existing shares_group_with security definer function
CREATE POLICY "Group members can view each other's profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id  -- Can always view own profile
  OR shares_group_with(auth.uid(), id)  -- Can view profiles of users who share a group
);