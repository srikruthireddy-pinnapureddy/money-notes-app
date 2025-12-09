-- Create personal_transactions table for individual ledger
CREATE TABLE public.personal_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category TEXT,
  notes TEXT,
  payment_mode TEXT DEFAULT 'cash',
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_personal_transactions_user_id ON public.personal_transactions(user_id);
CREATE INDEX idx_personal_transactions_date ON public.personal_transactions(transaction_date);

-- Enable Row Level Security
ALTER TABLE public.personal_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own transactions
CREATE POLICY "Users can view own transactions"
ON public.personal_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
ON public.personal_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions
CREATE POLICY "Users can update own transactions"
ON public.personal_transactions
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own transactions
CREATE POLICY "Users can delete own transactions"
ON public.personal_transactions
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_personal_transactions_updated_at
BEFORE UPDATE ON public.personal_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();