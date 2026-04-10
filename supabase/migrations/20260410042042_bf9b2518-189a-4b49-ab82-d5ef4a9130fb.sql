
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Group members can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Group members can create notifications for group members" ON public.notifications;

-- New policy: both sender and recipient must be members of the same group
CREATE POLICY "Group members can notify fellow group members"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  group_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = notifications.group_id
    AND group_members.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = notifications.group_id
    AND group_members.user_id = notifications.user_id
  )
);
