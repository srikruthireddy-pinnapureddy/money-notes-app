-- Create investments table for tracking SIPs, ETFs, Stocks, Mutual Funds
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'sip', 'etf', 'stock', 'mutual_fund', 'other'
  symbol TEXT, -- Stock/ETF symbol if applicable
  units NUMERIC NOT NULL DEFAULT 0,
  invested_amount NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own investments" 
ON public.investments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investments" 
ON public.investments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investments" 
ON public.investments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investments" 
ON public.investments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_investments_updated_at
BEFORE UPDATE ON public.investments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create investment_transactions table for SIP installments, buy/sell entries
CREATE TABLE public.investment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'buy', 'sell', 'sip_installment', 'dividend'
  units NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL,
  price_per_unit NUMERIC,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own investment transactions" 
ON public.investment_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investment transactions" 
ON public.investment_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investment transactions" 
ON public.investment_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investment transactions" 
ON public.investment_transactions 
FOR DELETE 
USING (auth.uid() = user_id);