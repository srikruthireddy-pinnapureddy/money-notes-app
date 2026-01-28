-- Create function to validate recurring expense split_config
CREATE OR REPLACE FUNCTION public.validate_recurring_expense_split_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  split_item jsonb;
  user_id_text text;
  user_id_uuid uuid;
  share_value numeric;
BEGIN
  -- Allow null or empty split_config
  IF NEW.split_config IS NULL OR NEW.split_config = '[]'::jsonb THEN
    RETURN NEW;
  END IF;

  -- Validate split_config is an array
  IF jsonb_typeof(NEW.split_config) != 'array' THEN
    RAISE EXCEPTION 'split_config must be a JSON array';
  END IF;

  -- Validate each item in the array
  FOR split_item IN SELECT * FROM jsonb_array_elements(NEW.split_config)
  LOOP
    -- Check that item is an object
    IF jsonb_typeof(split_item) != 'object' THEN
      RAISE EXCEPTION 'Each split_config item must be a JSON object';
    END IF;

    -- Check required fields exist
    IF NOT (split_item ? 'user_id') THEN
      RAISE EXCEPTION 'Each split_config item must have a user_id field';
    END IF;

    IF NOT (split_item ? 'share') THEN
      RAISE EXCEPTION 'Each split_config item must have a share field';
    END IF;

    -- Validate user_id is a valid UUID string
    user_id_text := split_item->>'user_id';
    BEGIN
      user_id_uuid := user_id_text::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid user_id format: %. Must be a valid UUID', user_id_text;
    END;

    -- Validate share is a positive number
    BEGIN
      share_value := (split_item->>'share')::numeric;
      IF share_value <= 0 THEN
        RAISE EXCEPTION 'Share value must be positive, got: %', share_value;
      END IF;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Invalid share value: %. Must be a positive number', split_item->>'share';
    END;

    -- Validate user_id is a member of the group
    IF NOT EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = NEW.group_id
        AND user_id = user_id_uuid
    ) THEN
      RAISE EXCEPTION 'User % is not a member of the group', user_id_text;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for validation on INSERT and UPDATE
DROP TRIGGER IF EXISTS validate_recurring_expense_split_config_trigger ON public.recurring_expenses;
CREATE TRIGGER validate_recurring_expense_split_config_trigger
  BEFORE INSERT OR UPDATE ON public.recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_recurring_expense_split_config();

-- Add comment for documentation
COMMENT ON FUNCTION public.validate_recurring_expense_split_config() IS 
'Validates that split_config is a valid JSON array with user_id (valid UUID, must be group member) and share (positive number) fields';