-- Create a function to get group info from invite code (public access for preview)
CREATE OR REPLACE FUNCTION public.get_group_info_from_invite(invite_code_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  invite_record RECORD;
BEGIN
  -- Find the invite and associated group
  SELECT 
    gi.id as invite_id,
    gi.expires_at,
    gi.max_uses,
    gi.uses_count,
    g.id as group_id,
    g.name as group_name,
    g.description as group_description,
    g.currency as group_currency
  INTO invite_record
  FROM group_invites gi
  JOIN groups g ON g.id = gi.group_id
  WHERE gi.code = invite_code_param;

  -- If no invite found
  IF invite_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid invite code'
    );
  END IF;

  -- Check if expired
  IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This invite has expired'
    );
  END IF;

  -- Check if max uses reached
  IF invite_record.max_uses IS NOT NULL AND invite_record.uses_count >= invite_record.max_uses THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This invite has reached its maximum uses'
    );
  END IF;

  -- Return group info
  RETURN json_build_object(
    'success', true,
    'group_id', invite_record.group_id,
    'group_name', invite_record.group_name,
    'group_description', invite_record.group_description,
    'group_currency', invite_record.group_currency
  );
END;
$$;