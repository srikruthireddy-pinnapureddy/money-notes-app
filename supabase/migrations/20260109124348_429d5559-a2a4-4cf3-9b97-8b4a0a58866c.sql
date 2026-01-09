-- Create expense_comments table
CREATE TABLE public.expense_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_comments ENABLE ROW LEVEL SECURITY;

-- Policies for expense_comments
CREATE POLICY "Group members can view expense comments"
ON public.expense_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM expenses e
    JOIN group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_comments.expense_id
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can add comments"
ON public.expense_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM expenses e
    JOIN group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_comments.expense_id
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own comments"
ON public.expense_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.expense_comments FOR DELETE
USING (auth.uid() = user_id);

-- Create activity_log table
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'expense_added', 'expense_updated', 'member_joined', 'settlement_made', 'comment_added'
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Policies for activity_log
CREATE POLICY "Group members can view activity"
ON public.activity_log FOR SELECT
USING (is_group_member(auth.uid(), group_id));

CREATE POLICY "Group members can create activity"
ON public.activity_log FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  is_group_member(auth.uid(), group_id)
);

-- Create index for performance
CREATE INDEX idx_expense_comments_expense_id ON public.expense_comments(expense_id);
CREATE INDEX idx_activity_log_group_id ON public.activity_log(group_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- Enable realtime for activity updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;