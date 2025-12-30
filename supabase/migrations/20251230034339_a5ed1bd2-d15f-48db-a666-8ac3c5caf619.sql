-- Add target_amount column to investments table for goal tracking
ALTER TABLE public.investments 
ADD COLUMN target_amount numeric DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.investments.target_amount IS 'Optional target value for investment goal tracking';