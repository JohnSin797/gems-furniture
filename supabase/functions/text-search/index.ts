import OpenAI from "https://esm.sh/openai@6.3.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// OpenAI + Supabase Clients
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")
});
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders
    });
  }
  try {
    const { query } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({
        error: "No query provided"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // 🔍 Ask GPT to extract search terms
    const analysis = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a furniture search assistant.
Extract relevant search terms from the user's query for furniture products.
Return ONLY a JSON array of search terms like: ["term1", "term2", "term3"]
Focus on furniture types, styles, materials, colors, rooms, etc.
`
        },
        {
          role: "user",
          content: `Extract search terms from: "${query}"`
        }
      ],
      response_format: {
        type: "json_object"
      }
    });

    const result = JSON.parse(analysis.choices[0].message.content);
    const searchTerms = result.searchTerms || [];
    console.log("🔍 Search terms:", searchTerms);

    // Search for matching products using the terms
    let queryBuilder = supabase.from("products").select("*").eq("status", "active");

    if (searchTerms.length > 0) {
      const searchConditions = searchTerms.map(term =>
        `name.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%,type.ilike.%${term}%`
      ).join(',');
      queryBuilder = queryBuilder.or(searchConditions);
    } else {
      // Fallback to searching the original query
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%,type.ilike.%${query}%`);
    }

    const { data: products, error } = await queryBuilder.limit(20);
    if (error) {
      console.error("Database search error:", error);
      throw error;
    }

    // Final Response
    return new Response(JSON.stringify({
      searchTerms,
      matchingProducts: products || []
    }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (err) {
    console.error("Text search error:", err);
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});