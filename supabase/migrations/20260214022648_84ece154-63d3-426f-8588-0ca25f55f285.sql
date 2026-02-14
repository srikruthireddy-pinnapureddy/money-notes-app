
-- Create a separate table for phone numbers with strict own-user-only RLS
CREATE TABLE public.user_phone_numbers (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Only the user can see their own phone number
CREATE POLICY "Users can view own phone number"
ON public.user_phone_numbers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phone number"
ON public.user_phone_numbers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone number"
ON public.user_phone_numbers FOR UPDATE
USING (auth.uid() = user_id);

-- Migrate existing phone numbers
INSERT INTO public.user_phone_numbers (user_id, phone_number)
SELECT id, phone_number FROM public.profiles WHERE phone_number IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Remove phone_number from profiles table
ALTER TABLE public.profiles DROP COLUMN phone_number;

-- Add updated_at trigger
CREATE TRIGGER update_user_phone_numbers_updated_at
BEFORE UPDATE ON public.user_phone_numbers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
