-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create groups (trips/events)
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT DEFAULT 'USD',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create group members
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'treasurer', 'viewer', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Create expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  paid_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'USD',
  description TEXT NOT NULL,
  category TEXT,
  receipt_url TEXT,
  expense_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create expense splits
CREATE TABLE public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expense_id, user_id)
);

-- Create settlements
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  from_user UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  to_user UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'USD',
  settled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Groups policies
CREATE POLICY "Users can view groups they are members of"
  ON public.groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON public.groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Group members policies
CREATE POLICY "Users can view members of their groups"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_members.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

CREATE POLICY "Group admins can remove members"
  ON public.group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_members.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Expenses policies
CREATE POLICY "Users can view expenses in their groups"
  ON public.expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = expenses.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (
    auth.uid() = paid_by AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = expenses.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role IN ('admin', 'treasurer', 'member')
    )
  );

CREATE POLICY "Expense creator can update their expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = paid_by);

CREATE POLICY "Expense creator can delete their expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = paid_by);

-- Expense splits policies
CREATE POLICY "Users can view splits in their groups"
  ON public.expense_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses
      JOIN public.group_members ON group_members.group_id = expenses.group_id
      WHERE expenses.id = expense_splits.expense_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Expense creator can create splits"
  ON public.expense_splits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE expenses.id = expense_splits.expense_id
      AND expenses.paid_by = auth.uid()
    )
  );

CREATE POLICY "Expense creator can update splits"
  ON public.expense_splits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE expenses.id = expense_splits.expense_id
      AND expenses.paid_by = auth.uid()
    )
  );

CREATE POLICY "Expense creator can delete splits"
  ON public.expense_splits FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE expenses.id = expense_splits.expense_id
      AND expenses.paid_by = auth.uid()
    )
  );

-- Settlements policies
CREATE POLICY "Users can view settlements in their groups"
  ON public.settlements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = settlements.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create settlements they're part of"
  ON public.settlements FOR INSERT
  WITH CHECK (
    (auth.uid() = from_user OR auth.uid() = to_user) AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = settlements.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone_number, display_name)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.phone)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();