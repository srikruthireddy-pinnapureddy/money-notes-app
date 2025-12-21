-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Add CHECK constraint for emoji length
ALTER TABLE public.message_reactions
ADD CONSTRAINT message_reactions_emoji_length CHECK (char_length(emoji) <= 10);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Group members can view reactions"
ON public.message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_messages gm
    JOIN group_members gmem ON gmem.group_id = gm.group_id
    WHERE gm.id = message_reactions.message_id
    AND gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can add reactions"
ON public.message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM group_messages gm
    JOIN group_members gmem ON gmem.group_id = gm.group_id
    WHERE gm.id = message_reactions.message_id
    AND gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove own reactions"
ON public.message_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Create index for performance
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);