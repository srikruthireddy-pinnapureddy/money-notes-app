-- Fix: Make chat-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- Fix: Add message content length constraint
ALTER TABLE public.group_messages ADD CONSTRAINT content_length_check CHECK (char_length(content) <= 5000);