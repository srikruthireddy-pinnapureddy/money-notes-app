-- Drop the existing SELECT policy that allows all group members to view invites
DROP POLICY IF EXISTS "Group members can view invites" ON public.group_invites;

-- Create new SELECT policy that only allows group admins to view invites
CREATE POLICY "Group admins can view invites" 
ON public.group_invites 
FOR SELECT 
USING (is_group_admin(auth.uid(), group_id));

-- Create a secure function to join a group via invite code
-- This function validates the invite and adds the user atomically
CREATE OR REPLACE FUNCTION public.join_group_with_invite(invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
  v_existing_member record;
  v_result json;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find and validate the invite code
  SELECT * INTO v_invite
  FROM public.group_invites
  WHERE code = invite_code
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR uses_count < max_uses);
  
  IF v_invite IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite code');
  END IF;

  -- Check if user is already a member
  SELECT * INTO v_existing_member
  FROM public.group_members
  WHERE group_id = v_invite.group_id AND user_id = v_user_id;
  
  IF v_existing_member IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member of this group');
  END IF;

  -- Add user to the group
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_invite.group_id, v_user_id, 'member');

  -- Increment the uses count
  UPDATE public.group_invites
  SET uses_count = COALESCE(uses_count, 0) + 1
  WHERE id = v_invite.id;

  -- Return success with group info
  RETURN json_build_object(
    'success', true, 
    'group_id', v_invite.group_id,
    'message', 'Successfully joined the group'
  );
END;
$$;