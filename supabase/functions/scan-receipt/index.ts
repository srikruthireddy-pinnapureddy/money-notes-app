import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  validateBase64Image,
  validationErrorResponse,
  parseJSONBody,
} from "../_shared/validation.ts";
import { validateCsrfRequest, requireCsrfValidation } from "../_shared/csrf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-csrf-token",
};

// Rate limit configuration: 10 requests per minute (AI calls are expensive)
const RATE_LIMIT_MAX_REQUESTS = 10;
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

async function checkRateLimit(
  supabaseUrl: string,
  supabaseServiceKey: string,
  identifier: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  try {
    // Create a fresh client for the RPC call to avoid type issues
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await serviceClient.rpc("check_rate_limit", {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: RATE_LIMIT_MAX_REQUESTS,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    } as Record<string, unknown>);

    if (error) {
      console.error("Rate limit check error:", error);
      // Allow on error to prevent blocking legitimate requests
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

  // CSRF validation for mutable requests
  const csrfError = requireCsrfValidation(req);
  if (csrfError) {
    const requestId = generateRequestId();
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    logAudit({
      timestamp: new Date().toISOString(),
      function_name: "scan-receipt",
      request_id: requestId,
      user_id: null,
      action: "csrf_validation",
      status: "blocked",
      details: { reason: "csrf_validation_failed" },
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    csrfError.headers.set("Access-Control-Allow-Origin", "*");
    csrfError.headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type, x-csrf-token");
    return csrfError;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Authentication check - verify user is logged in
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "scan-receipt",
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
        JSON.stringify({ error: "Unauthorized - no authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user with Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "scan-receipt",
        request_id: requestId,
        user_id: null,
        action: "authentication",
        status: "blocked",
        details: { reason: "invalid_token", error: authError?.message },
        duration_ms: Date.now() - startTime,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logAudit({
      timestamp: new Date().toISOString(),
      function_name: "scan-receipt",
      request_id: requestId,
      user_id: user.id,
      action: "authentication",
      status: "success",
      details: {},
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Rate limiting check
    const rateLimitResult = await checkRateLimit(supabaseUrl, supabaseServiceKey, user.id, "scan-receipt");

    if (!rateLimitResult.allowed) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "scan-receipt",
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

    // Parse and validate request body
    const bodyResult = await parseJSONBody(req);
    if (!bodyResult.valid) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "scan-receipt",
        request_id: requestId,
        user_id: user.id,
        action: "validation",
        status: "blocked",
        details: { reason: "invalid_body", error: bodyResult.error },
        duration_ms: Date.now() - startTime,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      return validationErrorResponse(bodyResult.error, corsHeaders);
    }

    const body = bodyResult.data as Record<string, unknown>;

    // Validate image data (base64 data URL, max 10MB)
    const imageResult = validateBase64Image(body.image, "image", 10 * 1024 * 1024);
    if (!imageResult.valid) {
      logAudit({
        timestamp: new Date().toISOString(),
        function_name: "scan-receipt",
        request_id: requestId,
        user_id: user.id,
        action: "validation",
        status: "blocked",
        details: { reason: "invalid_image", error: imageResult.error },
        duration_ms: Date.now() - startTime,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      return validationErrorResponse(imageResult.error, corsHeaders);
    }

    const image = imageResult.value;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing receipt image with OCR for user:", user.id);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an expert OCR system specialized in reading receipts and invoices. Carefully analyze this receipt image and extract:

1. TOTAL AMOUNT: Look for "Total", "Grand Total", "Amount Due", "Balance Due", or the final/largest amount. Extract only the numeric value without currency symbols.

2. DATE: Look for transaction date, purchase date, or any date on the receipt. Return in YYYY-MM-DD format. If no date found, return today's date.

3. MERCHANT/DESCRIPTION: Extract the store name, business name, or a brief description of what was purchased. Keep it concise (max 50 characters).

4. CATEGORY: Classify the expense into one of these categories based on the merchant type and items:
   - Food (restaurants, groceries, cafes)
   - Transport (fuel, parking, taxi, transit)
   - Accommodation (hotels, lodging)
   - Entertainment (movies, events, games)
   - Shopping (retail, clothing, electronics)
   - Utilities (bills, subscriptions)
   - Healthcare (pharmacy, medical)
   - Other (anything else)

Be precise with the amount - extract the final total, not subtotals or individual items. Use OCR to read all text carefully.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: image,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_receipt_data",
              description: "Extract structured receipt information using OCR",
              parameters: {
                type: "object",
                properties: {
                  amount: {
                    type: "number",
                    description:
                      "The total/final amount from the receipt (numeric value only, no currency symbols)",
                  },
                  description: {
                    type: "string",
                    description:
                      "The merchant name or brief description of the expense (max 50 characters)",
                  },
                  category: {
                    type: "string",
                    enum: [
                      "Food",
                      "Transport",
                      "Accommodation",
                      "Entertainment",
                      "Shopping",
                      "Utilities",
                      "Healthcare",
                      "Other",
                    ],
                    description: "The expense category",
                  },
                  date: {
                    type: "string",
                    description: "The transaction date in YYYY-MM-DD format",
                  },
                },
                required: ["amount", "description", "category", "date"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_receipt_data" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to analyze receipt" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response for user", user.id, ":", JSON.stringify(data));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error("No tool call found in response");
      return new Response(
        JSON.stringify({ error: "Failed to extract receipt data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const receiptData = JSON.parse(toolCall.function.arguments);
    
    logAudit({
      timestamp: new Date().toISOString(),
      function_name: "scan-receipt",
      request_id: requestId,
      user_id: user.id,
      action: "scan_complete",
      status: "success",
      details: {
        amount: receiptData.amount,
        category: receiptData.category,
        rate_limit_remaining: rateLimitResult.remaining,
      },
      duration_ms: Date.now() - startTime,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return new Response(JSON.stringify(receiptData), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": String(rateLimitResult.remaining),
      },
    });
  } catch (error) {
    logAudit({
      timestamp: new Date().toISOString(),
      function_name: "scan-receipt",
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
