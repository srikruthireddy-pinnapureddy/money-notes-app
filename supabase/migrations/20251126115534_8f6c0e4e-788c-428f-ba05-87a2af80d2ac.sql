-- Create helper function to avoid RLS recursion when checking group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = _group_id
      AND gm.user_id = _user_id
  );
$function$;

-- Update SELECT policy on group_members to use the helper function instead of
-- directly querying the same table in the policy expression (which caused
-- infinite recursion errors)
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;

CREATE POLICY "Users can view members of their groups"
ON public.group_members
FOR SELECT
USING (is_group_member(auth.uid(), group_id));