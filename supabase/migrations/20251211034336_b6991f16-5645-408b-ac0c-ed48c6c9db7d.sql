-- Remove the insecure UPDATE policy on group_invites
-- The join_group_with_invite RPC function handles uses_count updates securely via SECURITY DEFINER
DROP POLICY IF EXISTS "Allow uses_count update on valid invites" ON public.group_invites;