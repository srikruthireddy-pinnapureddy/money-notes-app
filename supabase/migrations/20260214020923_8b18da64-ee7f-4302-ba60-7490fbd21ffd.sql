
-- Add explicit auth.uid() NULL checks to critical SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION public.get_group_member_profiles(group_id_param uuid)
 RETURNS TABLE(id uuid, display_name text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT
    p.id,
    p.display_name,
    p.avatar_url
  FROM profiles_public p
  JOIN group_members gm ON gm.user_id = p.id
  WHERE gm.group_id = group_id_param
    AND auth.uid() IS NOT NULL
    AND is_group_member(auth.uid(), group_id_param);
$function$;

CREATE OR REPLACE FUNCTION public.join_group_with_invite(invite_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invite record;
  v_user_id uuid;
  v_existing_member record;
BEGIN
  -- Get the current user with explicit NULL check
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
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END
$function$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL OR _group_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.group_members
      WHERE group_id = _group_id
      AND user_id = _user_id
      AND role = 'admin'
    )
  END
$function$;

CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL OR _group_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.group_members gm
      WHERE gm.group_id = _group_id
        AND gm.user_id = _user_id
    )
  END
$function$;

CREATE OR REPLACE FUNCTION public.shares_group_with(_user_id uuid, _other_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL OR _other_user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = _user_id
        AND gm2.user_id = _other_user_id
    )
  END
$function$;
