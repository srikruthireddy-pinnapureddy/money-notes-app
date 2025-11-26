-- Fix infinite recursion in group_members policies
-- The issue: when creating a group, the creator needs to add themselves as admin
-- but the policy checks if they're already an admin (which they can't be yet)

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Group admins can add members" ON public.group_members;

-- Create new policy that allows users to add themselves OR admins to add others
CREATE POLICY "Users can add themselves or admins can add members" 
ON public.group_members 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR is_group_admin(auth.uid(), group_id)
);