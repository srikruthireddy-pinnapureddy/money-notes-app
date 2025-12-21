-- Add CHECK constraints for text field lengths across all tables

-- expenses table
ALTER TABLE public.expenses
ADD CONSTRAINT expenses_description_length CHECK (char_length(description) <= 500),
ADD CONSTRAINT expenses_category_length CHECK (category IS NULL OR char_length(category) <= 100);

-- personal_transactions table
ALTER TABLE public.personal_transactions
ADD CONSTRAINT personal_transactions_category_length CHECK (category IS NULL OR char_length(category) <= 100),
ADD CONSTRAINT personal_transactions_notes_length CHECK (notes IS NULL OR char_length(notes) <= 1000),
ADD CONSTRAINT personal_transactions_payment_mode_length CHECK (payment_mode IS NULL OR char_length(payment_mode) <= 50);

-- groups table
ALTER TABLE public.groups
ADD CONSTRAINT groups_name_length CHECK (char_length(name) <= 100),
ADD CONSTRAINT groups_description_length CHECK (description IS NULL OR char_length(description) <= 500),
ADD CONSTRAINT groups_currency_length CHECK (currency IS NULL OR char_length(currency) <= 10);

-- profiles table
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_display_name_length CHECK (display_name IS NULL OR char_length(display_name) <= 100),
ADD CONSTRAINT profiles_phone_number_length CHECK (phone_number IS NULL OR char_length(phone_number) <= 20);

-- investments table
ALTER TABLE public.investments
ADD CONSTRAINT investments_name_length CHECK (char_length(name) <= 200),
ADD CONSTRAINT investments_symbol_length CHECK (symbol IS NULL OR char_length(symbol) <= 20),
ADD CONSTRAINT investments_notes_length CHECK (notes IS NULL OR char_length(notes) <= 1000),
ADD CONSTRAINT investments_type_length CHECK (char_length(type) <= 50);

-- investment_transactions table
ALTER TABLE public.investment_transactions
ADD CONSTRAINT investment_transactions_notes_length CHECK (notes IS NULL OR char_length(notes) <= 1000),
ADD CONSTRAINT investment_transactions_type_length CHECK (char_length(type) <= 50);

-- notifications table
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_title_length CHECK (char_length(title) <= 200),
ADD CONSTRAINT notifications_message_length CHECK (char_length(message) <= 1000),
ADD CONSTRAINT notifications_type_length CHECK (char_length(type) <= 50);

-- group_messages table (verify/add constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'group_messages_content_length'
  ) THEN
    ALTER TABLE public.group_messages
    ADD CONSTRAINT group_messages_content_length CHECK (char_length(content) <= 5000);
  END IF;
END $$;

-- settlements table
ALTER TABLE public.settlements
ADD CONSTRAINT settlements_currency_length CHECK (currency IS NULL OR char_length(currency) <= 10);

-- group_members table
ALTER TABLE public.group_members
ADD CONSTRAINT group_members_role_length CHECK (role IS NULL OR char_length(role) <= 50);

-- group_invites table
ALTER TABLE public.group_invites
ADD CONSTRAINT group_invites_code_length CHECK (char_length(code) <= 50);