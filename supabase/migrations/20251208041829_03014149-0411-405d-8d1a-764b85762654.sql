-- Create group_messages table for group chat
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Group members can view messages in their groups
CREATE POLICY "Group members can view messages"
ON public.group_messages
FOR SELECT
USING (is_group_member(auth.uid(), group_id));

-- Group members can send messages
CREATE POLICY "Group members can send messages"
ON public.group_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND is_group_member(auth.uid(), group_id)
);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.group_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX idx_group_messages_created_at ON public.group_messages(created_at);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;