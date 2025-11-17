import OpenAI from "https://esm.sh/openai@6.3.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// OpenAI + Supabase Clients
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const formData = await req.formData();
    const imageFile = formData.get("image");

    if (!imageFile) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // Convert image file to Base64
    const buffer = await imageFile.arrayBuffer();
    const base64Image = btoa(
      String.fromCharCode(...new Uint8Array(buffer))
    );

    // 🔍 Ask GPT to classify furniture
    const analysis = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a furniture classifier.
Look at an image and return ONLY the category as one of:
chair, table, sofa, bed, cabinet, lamp, shelf, desk, stool, other
Respond in strict JSON: { "category": "<category>" }
`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Classify this furniture image in JSON." },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(analysis.choices[0].message.content);
    const category = result.category.toLowerCase();

    console.log("🪑 Category:", category);

    // Search for matching products
    let { data: products, error } = await supabase
      .from("products")
      .select("*")
      .or(
        `name.ilike.%${category}%,description.ilike.%${category}%,category.ilike.%${category}%,type.ilike.%${category}%`
      )
      .eq("status", "active")
      .limit(10);

    if (error) {
      console.error("Database search error:", error);
      throw error;
    }

    // Fetch ALL active products
    const { data: allProducts, error: allError } = await supabase
      .from("products")
      .select("*")
      .eq("status", "active");

    if (allError) {
      console.error("All products fetch error:", allError);
    }

    // Final Response
    return new Response(
      JSON.stringify({
        searchTerms: [category],
        matchingProducts: products,
        allProducts: allProducts || []
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  } catch (err) {
    console.error("Image classification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
