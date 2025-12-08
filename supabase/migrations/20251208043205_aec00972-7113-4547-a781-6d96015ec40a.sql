-- Add reply_to column for message replies
ALTER TABLE public.group_messages 
ADD COLUMN reply_to_id uuid REFERENCES public.group_messages(id) ON DELETE SET NULL;