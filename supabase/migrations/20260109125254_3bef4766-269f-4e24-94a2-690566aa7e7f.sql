-- Create recurring_expenses table
CREATE TABLE public.recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL,
  category text,
  currency text DEFAULT 'USD',
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  next_occurrence date NOT NULL,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month integer CHECK (day_of_month >= 1 AND day_of_month <= 31),
  split_config jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  last_processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for recurring_expenses
CREATE POLICY "Group members can view recurring expenses"
ON public.recurring_expenses FOR SELECT
USING (is_group_member(auth.uid(), group_id));

CREATE POLICY "Group members can create recurring expenses"
ON public.recurring_expenses FOR INSERT
WITH CHECK (auth.uid() = created_by AND is_group_member(auth.uid(), group_id));

CREATE POLICY "Creator can update recurring expenses"
ON public.recurring_expenses FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete recurring expenses"
ON public.recurring_expenses FOR DELETE
USING (auth.uid() = created_by);

-- Create payment_reminders table
CREATE TABLE public.payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  message text,
  sent_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz
);

-- Enable RLS
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_reminders
CREATE POLICY "Users can view reminders they sent or received"
ON public.payment_reminders FOR SELECT
USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Users can send reminders"
ON public.payment_reminders FOR INSERT
WITH CHECK (auth.uid() = from_user AND is_group_member(auth.uid(), group_id));

CREATE POLICY "Recipients can acknowledge reminders"
ON public.payment_reminders FOR UPDATE
USING (auth.uid() = to_user);

CREATE POLICY "Sender can delete reminders"
ON public.payment_reminders FOR DELETE
USING (auth.uid() = from_user);

-- Create budgets table
CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  monthly_limit numeric NOT NULL,
  alert_threshold numeric DEFAULT 0.8 CHECK (alert_threshold > 0 AND alert_threshold <= 1),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Enable RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- RLS policies for budgets
CREATE POLICY "Users can view own budgets"
ON public.budgets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own budgets"
ON public.budgets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
ON public.budgets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
ON public.budgets FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_recurring_expenses_group ON public.recurring_expenses(group_id);
CREATE INDEX idx_recurring_expenses_next ON public.recurring_expenses(next_occurrence) WHERE is_active = true;
CREATE INDEX idx_payment_reminders_to_user ON public.payment_reminders(to_user);
CREATE INDEX idx_payment_reminders_from_user ON public.payment_reminders(from_user);
CREATE INDEX idx_budgets_user ON public.budgets(user_id);

-- Add updated_at trigger for recurring_expenses
CREATE TRIGGER update_recurring_expenses_updated_at
  BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for budgets
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();