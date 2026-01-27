import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
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
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
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
      console.error("Failed to verify caller:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claimsData.claims.sub as string;
    console.log(`Push notification requested by user: ${callerId}`);

    // Create service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s) for push notifications`);

    // For now, just log the notifications that would be sent
    // In production, you'd use a proper web-push library or service
    const results = subscriptions.map((sub) => {
      console.log(`Would send push to user ${sub.user_id}:`, {
        title: payload.title,
        message: payload.message,
        endpoint: sub.endpoint.substring(0, 50) + "...",
      });
      return { userId: sub.user_id, queued: true };
    });

    // Create in-app notifications for users who have push subscriptions
    // This ensures they get notified even if push delivery fails
    // Note: Notifications are already created by the calling code
    // This edge function is for future web push implementation

    console.log(`Push notifications queued for ${results.length} user(s) by caller ${callerId}`);

    return new Response(
      JSON.stringify({
        success: true,
        queued: results.length,
        total: subscriptions.length,
        message: "Push notifications processed",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
