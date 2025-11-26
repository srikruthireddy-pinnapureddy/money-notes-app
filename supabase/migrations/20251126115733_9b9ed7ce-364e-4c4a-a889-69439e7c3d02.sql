-- Fix the groups SELECT policy to allow creators to see their own groups
-- even before the group_members row is inserted
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;

CREATE POLICY "Users can view groups they are members of or created"
ON public.groups
FOR SELECT
USING (
  -- User is the creator
  auth.uid() = created_by
  OR
  -- User is a member
  EXISTS (
    SELECT 1
    FROM group_members
    WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
  )
);