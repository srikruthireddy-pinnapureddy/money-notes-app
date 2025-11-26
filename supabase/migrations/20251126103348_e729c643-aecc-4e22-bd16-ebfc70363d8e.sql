-- Drop problematic policies
DROP POLICY IF EXISTS "Group admins can add members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON public.group_members;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = _group_id
    AND user_id = _user_id
    AND role = 'admin'
  )
$$;

-- Create new policies using the security definer function
CREATE POLICY "Group admins can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    public.is_group_admin(auth.uid(), group_id)
  );

CREATE POLICY "Group admins can remove members"
  ON public.group_members FOR DELETE
  USING (
    public.is_group_admin(auth.uid(), group_id)
  );

-- Add invite codes table for group sharing
CREATE TABLE public.group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  max_uses INTEGER DEFAULT NULL,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Policies for invites
CREATE POLICY "Group members can view invites"
  ON public.group_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_invites.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can create invites"
  ON public.group_invites FOR INSERT
  WITH CHECK (
    public.is_group_admin(auth.uid(), group_id)
  );

CREATE POLICY "Group admins can delete invites"
  ON public.group_invites FOR DELETE
  USING (
    public.is_group_admin(auth.uid(), group_id)
  );