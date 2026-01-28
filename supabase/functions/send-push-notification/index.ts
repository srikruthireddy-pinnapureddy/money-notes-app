import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit configuration: 30 push notification requests per minute
const RATE_LIMIT_MAX_REQUESTS = 30;
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

interface PushPayload {
  title: string;
  message: string;
  url?: string;
  groupId?: string;
  type?: string;
  tag?: string;
}

interface SendPushRequest {
  userIds: string[];
  payload: PushPayload;
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

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "send-push-notification",
        request_id: requestId,
        user_id: null,
        action: "configuration",
        status: "error",
        details: { reason: "vapid_keys_missing" },
        duration_ms: Date.now() - startTime,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "send-push-notification",
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
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with caller's auth to verify identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "send-push-notification",
        request_id: requestId,
        user_id: null,
        action: "authentication",
        status: "blocked",
        details: { reason: "invalid_token", error: claimsError?.message },
        duration_ms: Date.now() - startTime,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claimsData.claims.sub as string;
    
    logAudit({
      timestamp: new Date().toISOString(),
      function_name: "send-push-notification",
      request_id: requestId,
      user_id: callerId,
      action: "authentication",
      status: "success",
      details: {},
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Create service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting check
    const rateLimitResult = await checkRateLimit(supabaseUrl, supabaseServiceKey, callerId, "send-push-notification");

    if (!rateLimitResult.allowed) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "send-push-notification",
        request_id: requestId,
        user_id: callerId,
        action: "rate_limit",
        status: "blocked",
        details: { retry_after: rateLimitResult.retryAfter },
        duration_ms: Date.now() - startTime,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      return new Response(
        JSON.stringify({
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

    const { userIds, payload }: SendPushRequest = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "userIds array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payload || !payload.title || !payload.message) {
      return new Response(
        JSON.stringify({ error: "payload with title and message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate that the caller has permission to notify target users
    // They must share at least one group with all target users
    let validatedUserIds: string[] = [];

    if (payload.groupId) {
      // If groupId is provided, verify caller is a member and all target users are members
      const { data: callerMembership } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", payload.groupId)
        .eq("user_id", callerId)
        .maybeSingle();

      if (!callerMembership) {
        console.error(`Caller ${callerId} is not a member of group ${payload.groupId}`);
        return new Response(
          JSON.stringify({ error: "You are not a member of this group" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all target users who are members of the group
      const { data: groupMembers } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", payload.groupId)
        .in("user_id", userIds);

      validatedUserIds = groupMembers?.map((m) => m.user_id) || [];
    } else {
      // If no groupId, verify caller shares at least one group with each target user
      const { data: callerGroups } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", callerId);

      const callerGroupIds = callerGroups?.map((g) => g.group_id) || [];

      if (callerGroupIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "You are not a member of any groups" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all users who share a group with the caller
      const { data: sharedGroupMembers } = await supabase
        .from("group_members")
        .select("user_id")
        .in("group_id", callerGroupIds)
        .in("user_id", userIds);

      validatedUserIds = [...new Set(sharedGroupMembers?.map((m) => m.user_id) || [])];
    }

    if (validatedUserIds.length === 0) {
      console.log("No valid target users found for push notifications");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No valid recipients" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        }
      );
    }

    console.log(`Validated ${validatedUserIds.length} of ${userIds.length} target users`);

    // Get push subscriptions for validated users only
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", validatedUserIds);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for validated users:", validatedUserIds);
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s) for push notifications`);

    // For now, just log the notifications that would be sent
    const results = subscriptions.map((sub) => {
      return { userId: sub.user_id, queued: true };
    });

    logAudit({
      timestamp: new Date().toISOString(),
      function_name: "send-push-notification",
      request_id: requestId,
      user_id: callerId,
      action: "push_sent",
      status: "success",
      details: {
        target_users: validatedUserIds.length,
        subscriptions: results.length,
        notification_type: payload.type || "general",
        group_id: payload.groupId,
        rate_limit_remaining: rateLimitResult.remaining,
      },
      duration_ms: Date.now() - startTime,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return new Response(
      JSON.stringify({
        success: true,
        queued: results.length,
        total: subscriptions.length,
        message: "Push notifications processed",
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
      function_name: "send-push-notification",
      request_id: requestId,
      user_id: null,
      action: "error",
      status: "error",
      details: { error: error instanceof Error ? error.message : "Unknown error" },
      duration_ms: Date.now() - startTime,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
