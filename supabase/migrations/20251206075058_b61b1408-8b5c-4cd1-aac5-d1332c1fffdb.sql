-- Add UPDATE policy for group_invites to allow uses_count increment
-- Only allow updating uses_count when:
-- 1. The invite is not expired
-- 2. The max_uses limit is not exceeded (or is null for unlimited)
CREATE POLICY "Allow uses_count update on valid invites" 
ON public.group_invites 
FOR UPDATE 
USING (expires_at > now() AND (max_uses IS NULL OR uses_count < max_uses))
WITH CHECK (expires_at > now() AND (max_uses IS NULL OR uses_count <= max_uses));