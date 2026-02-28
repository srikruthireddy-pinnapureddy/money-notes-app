import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user's financial data for context
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();

    const [transactionsRes, groupsRes, expensesRes, investmentsRes] = await Promise.all([
      supabase
        .from("personal_transactions")
        .select("amount, type, category, notes, transaction_date, payment_mode")
        .gte("transaction_date", threeMonthsAgo)
        .order("transaction_date", { ascending: false })
        .limit(100),
      supabase.from("groups").select("id, name, currency").limit(20),
      supabase
        .from("expense_splits")
        .select("amount, expense_id, expenses(description, amount, category, expense_date, currency, group_id, groups(name))")
        .limit(50),
      supabase
        .from("investments")
        .select("name, type, invested_amount, current_value, is_active")
        .eq("is_active", true)
        .limit(20),
    ]);

    const transactions = transactionsRes.data || [];
    const groups = groupsRes.data || [];
    const splits = expensesRes.data || [];
    const investments = investmentsRes.data || [];

    // Build financial context
    const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

    const categoryBreakdown: Record<string, number> = {};
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      const cat = t.category || "Uncategorized";
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(t.amount);
    });

    // Monthly breakdown
    const monthlyBreakdown: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      const month = t.transaction_date.slice(0, 7); // YYYY-MM
      if (!monthlyBreakdown[month]) monthlyBreakdown[month] = { income: 0, expense: 0 };
      if (t.type === "income") monthlyBreakdown[month].income += Number(t.amount);
      else monthlyBreakdown[month].expense += Number(t.amount);
    });

    const investmentSummary = investments.map(
      (i) => `${i.name} (${i.type}): invested ₹${i.invested_amount}, current ₹${i.current_value}`
    );

    const recentTransactions = transactions.slice(0, 15).map(
      (t) => `${t.transaction_date}: ${t.type} ₹${t.amount} - ${t.category || "N/A"} (${t.notes || "no note"})`
    );

    const groupSplits = splits.slice(0, 20).map((s) => {
      const exp = s.expenses as any;
      return `You owe ₹${s.amount} for "${exp?.description}" in group "${exp?.groups?.name || "Unknown"}"`;
    });

    const context = `
## User Financial Summary (Last 3 Months)

**Personal Finance:**
- Total Income: ₹${totalIncome.toFixed(2)}
- Total Expenses: ₹${totalExpense.toFixed(2)}
- Net Balance: ₹${(totalIncome - totalExpense).toFixed(2)}

**Spending by Category:**
${Object.entries(categoryBreakdown)
  .sort(([, a], [, b]) => b - a)
  .map(([cat, amt]) => `- ${cat}: ₹${amt.toFixed(2)}`)
  .join("\n")}

**Monthly Breakdown:**
${Object.entries(monthlyBreakdown)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, d]) => `- ${month}: Income ₹${d.income.toFixed(2)}, Expenses ₹${d.expense.toFixed(2)}`)
  .join("\n")}

**Recent Transactions:**
${recentTransactions.join("\n")}

**Groups:** ${groups.map((g) => g.name).join(", ") || "None"}

**Group Expense Splits:**
${groupSplits.join("\n") || "None"}

**Active Investments:**
${investmentSummary.join("\n") || "None"}
`.trim();

    const systemPrompt = `You are ExpenX AI, a smart financial assistant embedded in the ExpenX expense management app. You help users understand their spending, group expenses, investments, and financial health.

RULES:
1. Use ONLY the provided financial context to answer questions. Never invent data.
2. If the answer is not in the context, say "I don't have enough data to answer that."
3. Be concise, friendly, and use ₹ for currency.
4. When showing amounts, round to 2 decimal places.
5. Offer actionable insights and tips when relevant.
6. You can do basic math (sums, averages, comparisons) on the provided data.
7. Format responses with markdown for readability.

CHART GENERATION:
When the user asks for a chart, visual summary, breakdown visualization, or comparison chart, include a chart block in your response using this EXACT format:

\`\`\`chart
{"type":"pie","title":"Spending by Category","data":[{"name":"Food","value":5000},{"name":"Transport","value":3000}]}
\`\`\`

Chart rules:
- "type" must be "pie" or "bar"
- "data" must be an array of {"name": string, "value": number} objects
- Use real data from the financial context — never invent values
- You can include text explanation before and/or after the chart block
- Use pie charts for category breakdowns and proportions
- Use bar charts for comparisons over time (monthly trends, income vs expenses)
- Always include a "title" field

FINANCIAL CONTEXT:
${context}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
