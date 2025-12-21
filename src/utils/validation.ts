import { z } from "zod";

// Validation schemas matching database CHECK constraints

// Expenses
export const expenseSchema = z.object({
  description: z.string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or less"),
  amount: z.number()
    .positive("Amount must be positive")
    .max(999999999, "Amount is too large"),
  category: z.string()
    .max(100, "Category must be 100 characters or less")
    .optional()
    .nullable(),
});

// Personal transactions
export const transactionSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(500, "Title must be 500 characters or less"),
  amount: z.number()
    .positive("Amount must be positive")
    .max(999999999, "Amount is too large"),
  category: z.string()
    .max(100, "Category must be 100 characters or less")
    .optional()
    .nullable(),
  notes: z.string()
    .max(1000, "Notes must be 1000 characters or less")
    .optional()
    .nullable(),
  paymentMode: z.string()
    .max(50, "Payment mode must be 50 characters or less")
    .optional()
    .nullable(),
});

// Groups
export const groupSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Group name is required")
    .max(100, "Group name must be 100 characters or less"),
  description: z.string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .nullable(),
  currency: z.string()
    .max(10, "Currency code must be 10 characters or less")
    .optional()
    .nullable(),
});

// Profiles
export const profileSchema = z.object({
  displayName: z.string()
    .max(100, "Display name must be 100 characters or less")
    .optional()
    .nullable(),
  phoneNumber: z.string()
    .max(20, "Phone number must be 20 characters or less")
    .optional()
    .nullable(),
});

// Investments
export const investmentSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Investment name is required")
    .max(200, "Name must be 200 characters or less"),
  type: z.string()
    .min(1, "Investment type is required")
    .max(50, "Type must be 50 characters or less"),
  symbol: z.string()
    .max(20, "Symbol must be 20 characters or less")
    .optional()
    .nullable(),
  notes: z.string()
    .max(1000, "Notes must be 1000 characters or less")
    .optional()
    .nullable(),
  units: z.number()
    .min(0, "Units cannot be negative")
    .optional(),
  investedAmount: z.number()
    .positive("Invested amount must be positive")
    .max(999999999999, "Amount is too large"),
  currentValue: z.number()
    .min(0, "Current value cannot be negative")
    .max(999999999999, "Value is too large")
    .optional(),
});

// Investment transactions
export const investmentTransactionSchema = z.object({
  type: z.string()
    .min(1, "Transaction type is required")
    .max(50, "Type must be 50 characters or less"),
  notes: z.string()
    .max(1000, "Notes must be 1000 characters or less")
    .optional()
    .nullable(),
  amount: z.number()
    .positive("Amount must be positive"),
  units: z.number()
    .min(0, "Units cannot be negative"),
});

// Group messages
export const messageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(5000, "Message must be 5000 characters or less"),
});

// Notifications
export const notificationSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  message: z.string()
    .trim()
    .min(1, "Message is required")
    .max(1000, "Message must be 1000 characters or less"),
  type: z.string()
    .max(50, "Type must be 50 characters or less"),
});

// Helper function to validate and get error message
export function validateField<T>(
  schema: z.ZodType<T>,
  value: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors[0]?.message || "Invalid input" };
}

// Character count helpers
export const MAX_LENGTHS = {
  expenseDescription: 500,
  expenseCategory: 100,
  transactionNotes: 1000,
  transactionCategory: 100,
  groupName: 100,
  groupDescription: 500,
  profileDisplayName: 100,
  profilePhoneNumber: 20,
  investmentName: 200,
  investmentSymbol: 20,
  investmentNotes: 1000,
  messageContent: 5000,
  notificationTitle: 200,
  notificationMessage: 1000,
} as const;
