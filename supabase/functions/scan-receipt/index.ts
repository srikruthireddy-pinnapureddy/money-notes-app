import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check - verify user is logged in
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - no authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user with Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { image } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: "Image data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

Be precise with the amount - extract the final total, not subtotals or individual items. Use OCR to read all text carefully.`
              },
              {
                type: "image_url",
                image_url: {
                  url: image
                }
              }
            ]
          }
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
                    description: "The total/final amount from the receipt (numeric value only, no currency symbols)"
                  },
                  description: {
                    type: "string",
                    description: "The merchant name or brief description of the expense (max 50 characters)"
                  },
                  category: {
                    type: "string",
                    enum: ["Food", "Transport", "Accommodation", "Entertainment", "Shopping", "Utilities", "Healthcare", "Other"],
                    description: "The expense category"
                  },
                  date: {
                    type: "string",
                    description: "The transaction date in YYYY-MM-DD format"
                  }
                },
                required: ["amount", "description", "category", "date"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_receipt_data" } }
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
    console.log("Extracted receipt data for user", user.id, ":", receiptData);

    return new Response(
      JSON.stringify(receiptData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in scan-receipt function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
