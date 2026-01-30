import { supabase } from "@/integrations/supabase/client";

const DEMO_TRANSACTIONS = [
  { type: "income", amount: 5000, category: "Salary", notes: "Monthly salary", payment_mode: "bank_transfer", daysAgo: 25 },
  { type: "expense", amount: 1200, category: "Bills & Utilities", notes: "Rent payment", payment_mode: "bank_transfer", daysAgo: 24 },
  { type: "expense", amount: 85, category: "Food & Dining", notes: "Grocery shopping", payment_mode: "card", daysAgo: 22 },
  { type: "expense", amount: 45, category: "Transportation", notes: "Uber rides", payment_mode: "upi", daysAgo: 20 },
  { type: "expense", amount: 120, category: "Entertainment", notes: "Movie night", payment_mode: "card", daysAgo: 18 },
  { type: "income", amount: 500, category: "Freelance", notes: "Side project", payment_mode: "bank_transfer", daysAgo: 15 },
  { type: "expense", amount: 65, category: "Food & Dining", notes: "Restaurant dinner", payment_mode: "upi", daysAgo: 12 },
  { type: "expense", amount: 200, category: "Shopping", notes: "New headphones", payment_mode: "card", daysAgo: 10 },
  { type: "expense", amount: 35, category: "Healthcare", notes: "Pharmacy", payment_mode: "cash", daysAgo: 7 },
  { type: "expense", amount: 150, category: "Bills & Utilities", notes: "Electricity bill", payment_mode: "upi", daysAgo: 5 },
  { type: "expense", amount: 55, category: "Food & Dining", notes: "Coffee & snacks", payment_mode: "cash", daysAgo: 3 },
  { type: "expense", amount: 90, category: "Transportation", notes: "Fuel", payment_mode: "card", daysAgo: 1 },
];

export async function createDemoTransactions(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    // Check if user already has transactions
    const { data: existingTransactions } = await supabase
      .from("personal_transactions")
      .select("id")
      .limit(1);

    if (existingTransactions && existingTransactions.length > 0) {
      return false;
    }

    const now = new Date();
    const transactions = DEMO_TRANSACTIONS.map((t) => {
      const transactionDate = new Date(now);
      transactionDate.setDate(transactionDate.getDate() - t.daysAgo);
      
      return {
        user_id: user.id,
        type: t.type,
        amount: t.amount,
        category: t.category,
        notes: t.notes,
        payment_mode: t.payment_mode,
        transaction_date: transactionDate.toISOString(),
      };
    });

    const { error } = await supabase
      .from("personal_transactions")
      .insert(transactions);

    if (error) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
