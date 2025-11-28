-- 1. Create helper function to check if two users share a group (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.shares_group_with(_user_id uuid, _other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = _user_id
      AND gm2.user_id = _other_user_id
  )
$$;

-- 2. Drop the existing overly permissive profiles policy
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- 3. Create new restrictive policy - users can only see own profile or shared group members
CREATE POLICY "Users can view own profile or shared group members" ON profiles
FOR SELECT USING (
  auth.uid() = id 
  OR public.shares_group_with(auth.uid(), id)
);

-- 4. Make settlements immutable - no updates allowed
CREATE POLICY "No settlement updates" ON settlements
FOR UPDATE USING (false);

-- 5. Make settlements immutable - no deletes allowed
CREATE POLICY "No settlement deletes" ON settlements
FOR DELETE USING (false);