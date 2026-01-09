-- Add delete policy for groups (only admins can delete their groups)
CREATE POLICY "Group admins can delete groups"
ON public.groups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);