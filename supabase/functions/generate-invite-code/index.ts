import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateCsrfRequest } from "../_shared/csrf.ts";
import { validateUUID } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-csrf-token",
};

// Generate cryptographically secure invite code
function generateSecureCode(length = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  // Use base36 encoding for alphanumeric codes
  return Array.from(array, (byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .substring(0, length)
    .toUpperCase();
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Validate CSRF
    const csrfValidation = validateCsrfRequest(req);
    if (!csrfValidation.valid) {
      console.error("CSRF validation failed:", csrfValidation.error);
      return new Response(JSON.stringify({ error: csrfValidation.error }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    const body = await req.json();
    const groupIdResult = validateUUID(body.group_id, "group_id");
    if (!groupIdResult.valid) {
      return new Response(JSON.stringify({ error: groupIdResult.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const groupId = groupIdResult.value;

    // Check rate limit (max 10 invite codes per hour per user)
    const { data: rateLimit, error: rateLimitError } = await supabase.rpc("check_rate_limit", {
      p_identifier: user.id,
      p_endpoint: "generate-invite-code",
      p_max_requests: 10,
      p_window_seconds: 3600,
    });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    } else if (rateLimit && !rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          retry_after: rateLimit.retry_after,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user is admin of the group
    const { data: isAdmin, error: adminError } = await supabase.rpc("is_group_admin", {
      _user_id: user.id,
      _group_id: groupId,
    });

    if (adminError) {
      console.error("Admin check error:", adminError);
      return new Response(JSON.stringify({ error: "Failed to verify permissions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only group admins can create invite codes" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate secure code with collision check
    let code: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      code = generateSecureCode(16);
      attempts++;

      // Check if code already exists
      const { data: existing } = await supabase
        .from("group_invites")
        .select("id")
        .eq("code", code)
        .maybeSingle();

      if (!existing) break;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      console.error("Failed to generate unique invite code after max attempts");
      return new Response(JSON.stringify({ error: "Failed to generate invite code" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert invite code into database
    const { data: invite, error: insertError } = await supabase
      .from("group_invites")
      .insert({
        group_id: groupId,
        code: code,
        created_by: user.id,
        max_uses: 50, // Reasonable limit to prevent abuse
      })
      .select("id, code, expires_at, max_uses")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create invite code" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Invite code generated for group ${groupId} by user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        invite: {
          id: invite.id,
          code: invite.code,
          expires_at: invite.expires_at,
          max_uses: invite.max_uses,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
