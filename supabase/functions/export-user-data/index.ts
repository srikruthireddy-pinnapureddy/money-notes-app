import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeString } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit configuration: 3 exports per hour (heavy operation)
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_SECONDS = 3600;

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

Deno.serve(async (req) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "export-user-data",
        request_id: requestId,
        user_id: null,
        action: "authentication",
        status: "blocked",
        details: { reason: "missing_auth_header" },
        duration_ms: Date.now() - startTime,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "export-user-data",
        request_id: requestId,
        user_id: null,
        action: "authentication",
        status: "blocked",
        details: { reason: "invalid_token", error: userError?.message },
        duration_ms: Date.now() - startTime,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logAudit({
      timestamp: new Date().toISOString(),
      function_name: "export-user-data",
      request_id: requestId,
      user_id: user.id,
      action: "authentication",
      status: "success",
      details: {},
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Rate limiting check
    const rateLimitResult = await checkRateLimit(supabaseUrl, supabaseServiceKey, user.id, "export-user-data");

    if (!rateLimitResult.allowed) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "export-user-data",
        request_id: requestId,
        user_id: user.id,
        action: "rate_limit",
        status: "blocked",
        details: { retry_after: rateLimitResult.retryAfter },
        duration_ms: Date.now() - startTime,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. You can export data 3 times per hour.",
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.retryAfter || 3600),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // Collect all user data from various tables
    // Sanitize user-provided data in export to prevent XSS when viewed
    const exportData: Record<string, unknown> = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      email: sanitizeString(user.email, 255),
      phone: sanitizeString(user.phone, 20),
      created_at: user.created_at,
    };

    // Profile data
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    exportData.profile = profile;

    // Personal transactions
    const { data: personalTransactions } = await supabase
      .from("personal_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    exportData.personal_transactions = personalTransactions || [];

    // Investments
    const { data: investments } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    exportData.investments = investments || [];

    // Investment transactions
    const { data: investmentTransactions } = await supabase
      .from("investment_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    exportData.investment_transactions = investmentTransactions || [];

    // Groups created by user
    const { data: createdGroups } = await supabase
      .from("groups")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    exportData.groups_created = createdGroups || [];

    // Group memberships
    const { data: groupMemberships } = await supabase
      .from("group_members")
      .select("*, groups(name, description, currency)")
      .eq("user_id", user.id);
    exportData.group_memberships = groupMemberships || [];

    // Expenses paid by user
    const { data: expenses } = await supabase
      .from("expenses")
      .select("*, groups(name)")
      .eq("paid_by", user.id)
      .order("created_at", { ascending: false });
    exportData.expenses_paid = expenses || [];

    // Expense splits for user
    const { data: expenseSplits } = await supabase
      .from("expense_splits")
      .select("*, expenses(description, amount, currency, expense_date)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    exportData.expense_splits = expenseSplits || [];

    // Settlements involving user
    const { data: settlementsFrom } = await supabase
      .from("settlements")
      .select("*, groups(name)")
      .eq("from_user", user.id)
      .order("created_at", { ascending: false });

    const { data: settlementsTo } = await supabase
      .from("settlements")
      .select("*, groups(name)")
      .eq("to_user", user.id)
      .order("created_at", { ascending: false });

    exportData.settlements = {
      paid: settlementsFrom || [],
      received: settlementsTo || [],
    };

    // Group messages sent by user
    const { data: messages } = await supabase
      .from("group_messages")
      .select("id, content, created_at, edited_at, group_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    exportData.messages_sent = messages || [];

    // Notifications
    const { data: notifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    exportData.notifications = notifications || [];

    // Push subscriptions (exclude sensitive keys)
    const { data: pushSubscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, created_at")
      .eq("user_id", user.id);
    exportData.push_subscriptions = pushSubscriptions || [];

    logAudit({
      timestamp: new Date().toISOString(),
      function_name: "export-user-data",
      request_id: requestId,
      user_id: user.id,
      action: "export_complete",
      status: "success",
      details: {
        tables_exported: Object.keys(exportData).length,
        rate_limit_remaining: rateLimitResult.remaining,
      },
      duration_ms: Date.now() - startTime,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Return as downloadable JSON
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="user-data-export-${new Date().toISOString().split("T")[0]}.json"`,
        "X-RateLimit-Remaining": String(rateLimitResult.remaining),
      },
    });
  } catch (error) {
    logAudit({
      timestamp: new Date().toISOString(),
      function_name: "export-user-data",
      request_id: requestId,
      user_id: null,
      action: "error",
      status: "error",
      details: { error: error instanceof Error ? error.message : "Unknown error" },
      duration_ms: Date.now() - startTime,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    return new Response(
      JSON.stringify({ error: "Failed to export data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
