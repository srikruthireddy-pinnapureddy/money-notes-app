-- Function to validate expense splits sum equals expense amount
CREATE OR REPLACE FUNCTION public.validate_expense_splits()
RETURNS TRIGGER AS $$
DECLARE
  v_expense_id uuid;
  v_expense_amount numeric;
  v_splits_sum numeric;
BEGIN
  -- Determine which expense to validate
  IF TG_OP = 'DELETE' THEN
    v_expense_id := OLD.expense_id;
  ELSE
    v_expense_id := NEW.expense_id;
  END IF;

  -- Get the expense amount
  SELECT amount INTO v_expense_amount
  FROM public.expenses
  WHERE id = v_expense_id;

  -- If expense doesn't exist, allow the operation (foreign key will handle this)
  IF v_expense_amount IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Calculate sum of all splits for this expense
  SELECT COALESCE(SUM(amount), 0) INTO v_splits_sum
  FROM public.expense_splits
  WHERE expense_id = v_expense_id;

  -- For DELETE, the OLD row is still in the sum, so subtract it
  IF TG_OP = 'DELETE' THEN
    v_splits_sum := v_splits_sum - OLD.amount;
  END IF;

  -- For UPDATE, adjust for the difference
  IF TG_OP = 'UPDATE' THEN
    v_splits_sum := v_splits_sum - OLD.amount + NEW.amount;
  END IF;

  -- Validate: splits must equal expense amount (with small tolerance for floating point)
  -- Allow if splits sum is 0 (expense being created, splits added later)
  -- Or if splits sum matches expense amount
  IF v_splits_sum > 0 AND ABS(v_splits_sum - v_expense_amount) > 0.01 THEN
    RAISE EXCEPTION 'Expense splits total (%) does not match expense amount (%). Difference: %',
      v_splits_sum, v_expense_amount, ABS(v_splits_sum - v_expense_amount);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on expense_splits table
DROP TRIGGER IF EXISTS validate_expense_splits_trigger ON public.expense_splits;

CREATE TRIGGER validate_expense_splits_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.expense_splits
FOR EACH ROW
EXECUTE FUNCTION public.validate_expense_splits();

-- Also validate when expense amount is updated
CREATE OR REPLACE FUNCTION public.validate_expense_amount_change()
RETURNS TRIGGER AS $$
DECLARE
  v_splits_sum numeric;
BEGIN
  -- Only validate if amount changed
  IF OLD.amount = NEW.amount THEN
    RETURN NEW;
  END IF;

  -- Get sum of splits
  SELECT COALESCE(SUM(amount), 0) INTO v_splits_sum
  FROM public.expense_splits
  WHERE expense_id = NEW.id;

  -- If no splits exist yet, allow the change
  IF v_splits_sum = 0 THEN
    RETURN NEW;
  END IF;

  -- Validate splits match new amount
  IF ABS(v_splits_sum - NEW.amount) > 0.01 THEN
    RAISE EXCEPTION 'Cannot change expense amount to % because existing splits total %. Update splits first.',
      NEW.amount, v_splits_sum;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on expenses table
DROP TRIGGER IF EXISTS validate_expense_amount_trigger ON public.expenses;

CREATE TRIGGER validate_expense_amount_trigger
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.validate_expense_amount_change();