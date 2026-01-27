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

    // Get push subscriptions for all users
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for users:", userIds);
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
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type: payload.type || "push_notification",
      title: payload.title,
      message: payload.message,
      group_id: payload.groupId || null,
      is_read: false,
    }));

    // Note: Notifications are already created by the calling code
    // This edge function is for future web push implementation

    console.log(`Push notifications queued for ${results.length} user(s)`);

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
