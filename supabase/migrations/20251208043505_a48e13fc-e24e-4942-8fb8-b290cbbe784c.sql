-- Create table to track message read receipts
CREATE TABLE public.message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Users can view read receipts for messages in their groups
CREATE POLICY "Group members can view read receipts"
ON public.message_reads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_messages gm
    JOIN group_members gmem ON gmem.group_id = gm.group_id
    WHERE gm.id = message_reads.message_id
    AND gmem.user_id = auth.uid()
  )
);

-- Users can mark messages as read in their groups
CREATE POLICY "Group members can mark messages read"
ON public.message_reads FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM group_messages gm
    JOIN group_members gmem ON gmem.group_id = gm.group_id
    WHERE gm.id = message_reads.message_id
    AND gmem.user_id = auth.uid()
  )
);

-- Enable realtime for read receipts
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;