-- Add UPDATE policy for users to edit their own messages
CREATE POLICY "Users can update own messages"
ON public.group_messages FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add edited_at column to track edits
ALTER TABLE public.group_messages 
ADD COLUMN edited_at timestamp with time zone DEFAULT NULL;