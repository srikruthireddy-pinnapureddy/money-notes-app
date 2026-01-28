import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit configuration: 5 requests per minute (this is a batch operation)
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60;

// Security audit logging
interface AuditLogEntry {
  timestamp: string;
  function_name: string;
  request_id: string;
  user_id: string | null;
  action: string;
  status: "success" | "error" | "blocked";
  details: Record<string, unknown>;
  duration_ms?: number;
  ip_address?: string;
  user_agent?: string;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function logAudit(entry: AuditLogEntry): void {
  console.log(JSON.stringify({
    audit: true,
    ...entry,
  }));
}

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

async function checkRateLimit(
  supabaseUrl: string,
  supabaseServiceKey: string,
  identifier: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  try {
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await serviceClient.rpc("check_rate_limit", {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: RATE_LIMIT_MAX_REQUESTS,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    } as Record<string, unknown>);

    if (error) {
      console.error("Rate limit check error:", error);
      return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS };
    }

    const result = data as { allowed: boolean; remaining: number; retry_after?: number };
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      retryAfter: result.retry_after,
    };
  } catch (error) {
    console.error("Rate limit exception:", error);
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS };
  }
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
  const startTime = Date.now();
  const requestId = generateRequestId();
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

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

    let rateLimitIdentifier = "system";

    // Option 1: Validate JWT token (for authenticated user calls)
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } =
        await supabaseClient.auth.getClaims(token);

      if (claimsError || !claimsData?.claims) {
        logAudit({
          timestamp: new Date().toISOString(),
          function_name: "process-recurring-expenses",
          request_id: requestId,
          user_id: null,
          action: "authentication",
          status: "blocked",
          details: { reason: "invalid_jwt", error: claimsError?.message },
          duration_ms: Date.now() - startTime,
          ip_address: ipAddress,
          user_agent: userAgent,
        });
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized - invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use user ID for rate limiting
      rateLimitIdentifier = claimsData.claims.sub as string;
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "process-recurring-expenses",
        request_id: requestId,
        user_id: rateLimitIdentifier,
        action: "authentication",
        status: "success",
        details: { method: "jwt" },
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    }
    // Option 2: Validate API key (for scheduled/cron calls)
    else if (apiKeyHeader && expectedApiKey && apiKeyHeader === expectedApiKey) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "process-recurring-expenses",
        request_id: requestId,
        user_id: null,
        action: "authentication",
        status: "success",
        details: { method: "api_key" },
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      rateLimitIdentifier = "cron-job";
    }
    // No valid authentication
    else {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "process-recurring-expenses",
        request_id: requestId,
        user_id: null,
        action: "authentication",
        status: "blocked",
        details: { reason: "no_valid_auth" },
        duration_ms: Date.now() - startTime,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting check
    const rateLimitResult = await checkRateLimit(
      supabaseUrl,
      supabaseServiceKey,
      rateLimitIdentifier,
      "process-recurring-expenses"
    );

    if (!rateLimitResult.allowed) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "process-recurring-expenses",
        request_id: requestId,
        user_id: rateLimitIdentifier === "cron-job" ? null : rateLimitIdentifier,
        action: "rate_limit",
        status: "blocked",
        details: { retry_after: rateLimitResult.retryAfter },
        duration_ms: Date.now() - startTime,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.retryAfter || 60),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

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
          const lastProcessed = new Date(expense.last_processed_at)
            .toISOString()
            .split("T")[0];
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
        const nextOccurrence = calculateNextOccurrence(
          expense.next_occurrence,
          expense.frequency
        );

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
      } catch (error: unknown) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`${expense.id}: ${errorMessage}`);
      }
    }

    logAudit({
      timestamp: new Date().toISOString(),
      function_name: "process-recurring-expenses",
      request_id: requestId,
      user_id: rateLimitIdentifier === "cron-job" ? null : rateLimitIdentifier,
      action: "process_complete",
      status: results.failed > 0 ? "error" : "success",
      details: {
        processed: results.processed,
        failed: results.failed,
        total_due: dueExpenses?.length || 0,
        rate_limit_remaining: rateLimitResult.remaining,
      },
      duration_ms: Date.now() - startTime,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} expenses, ${results.failed} failed`,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      }
    );
  } catch (error: unknown) {
    logAudit({
      timestamp: new Date().toISOString(),
      function_name: "process-recurring-expenses",
      request_id: requestId,
      user_id: null,
      action: "error",
      status: "error",
      details: { error: error instanceof Error ? error.message : "Unknown error" },
      duration_ms: Date.now() - startTime,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
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
