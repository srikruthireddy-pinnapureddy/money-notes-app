import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecurringExpense {
  id: string;
  group_id: string;
  created_by: string;
  description: string;
  amount: number;
  category: string | null;
  currency: string;
  frequency: string;
  next_occurrence: string;
  last_processed_at: string | null;
  split_config: { user_id: string; share: number }[];
}

function calculateNextOccurrence(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate authentication - require either a valid JWT or a secret API key
    const authHeader = req.headers.get("Authorization");
    const apiKeyHeader = req.headers.get("X-API-Key");
    const expectedApiKey = Deno.env.get("RECURRING_EXPENSES_API_KEY");

    // Option 1: Validate JWT token (for authenticated user calls)
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
      
      if (claimsError || !claimsData?.claims) {
        console.error("Invalid JWT token:", claimsError);
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized - invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Optionally check for admin role
      const userId = claimsData.claims.sub;
      console.log(`Authenticated request from user: ${userId}`);
    } 
    // Option 2: Validate API key (for scheduled/cron calls)
    else if (apiKeyHeader && expectedApiKey && apiKeyHeader === expectedApiKey) {
      console.log("Authenticated via API key for scheduled execution");
    } 
    // No valid authentication
    else {
      console.error("No valid authentication provided");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];

    // Fetch recurring expenses due today or earlier
    const { data: dueExpenses, error: fetchError } = await supabase
      .from("recurring_expenses")
      .select("*")
      .eq("is_active", true)
      .lte("next_occurrence", today);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${dueExpenses?.length || 0} recurring expenses to process`);

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const expense of (dueExpenses || []) as RecurringExpense[]) {
      try {
        // Add idempotency check - skip if already processed today
        if (expense.last_processed_at) {
          const lastProcessed = new Date(expense.last_processed_at).toISOString().split("T")[0];
          if (lastProcessed === today) {
            console.log(`Skipping expense ${expense.id} - already processed today`);
            continue;
          }
        }

        // Create the expense
        const { data: newExpense, error: expenseError } = await supabase
          .from("expenses")
          .insert({
            group_id: expense.group_id,
            description: `[Auto] ${expense.description}`,
            amount: expense.amount,
            currency: expense.currency,
            category: expense.category,
            paid_by: expense.created_by,
            expense_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (expenseError) {
          throw expenseError;
        }

        // Create expense splits
        const totalShares = expense.split_config.reduce((sum, s) => sum + s.share, 0);
        const splits = expense.split_config.map((split) => ({
          expense_id: newExpense.id,
          user_id: split.user_id,
          amount: Math.round((expense.amount * split.share / totalShares) * 100) / 100,
        }));

        const { error: splitsError } = await supabase
          .from("expense_splits")
          .insert(splits);

        if (splitsError) {
          throw splitsError;
        }

        // Update next occurrence
        const nextOccurrence = calculateNextOccurrence(expense.next_occurrence, expense.frequency);
        
        const { error: updateError } = await supabase
          .from("recurring_expenses")
          .update({
            next_occurrence: nextOccurrence,
            last_processed_at: new Date().toISOString(),
          })
          .eq("id", expense.id);

        if (updateError) {
          throw updateError;
        }

        // Create activity log entry
        await supabase.from("activity_log").insert({
          group_id: expense.group_id,
          user_id: expense.created_by,
          action_type: "recurring_expense_created",
          metadata: {
            expense_id: newExpense.id,
            description: expense.description,
            amount: expense.amount,
          },
        });

        // Create notifications for split members
        for (const split of expense.split_config) {
          if (split.user_id !== expense.created_by) {
            await supabase.from("notifications").insert({
              user_id: split.user_id,
              type: "expense_added",
              title: "Recurring Expense",
              message: `${expense.description} - ${expense.currency} ${expense.amount.toFixed(2)}`,
              group_id: expense.group_id,
              related_id: newExpense.id,
            });
          }
        }

        results.processed++;
        console.log(`Processed recurring expense: ${expense.description}`);
      } catch (error: unknown) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`${expense.id}: ${errorMessage}`);
        console.error(`Failed to process expense ${expense.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} expenses, ${results.failed} failed`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error processing recurring expenses:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
