-- Add file_url column to group_messages for attachments
ALTER TABLE public.group_messages 
ADD COLUMN file_url TEXT,
ADD COLUMN file_type TEXT;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true);

-- Storage policies for chat attachments
CREATE POLICY "Group members can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view chat attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete own attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);