import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Image search function starting');
    
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      throw new Error('No image file provided');
    }

    console.log('Image file received:', imageFile.name, imageFile.size);

    // Convert image to base64
    const imageBytes = await imageFile.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));

    // Get Google Cloud service account from Supabase secrets
    const serviceAccountJson = Deno.env.get('GCLOUD_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      console.log('Google Cloud service account not configured, using fallback search');
      // Fallback: return empty results with a message
      return new Response(JSON.stringify({
        searchTerms: ['image search not available'],
        dominantColors: [],
        matchingProducts: [],
        analysis: { labels: [], objects: [] },
        error: 'Image search service not configured'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Service account loaded, parsing JSON...');
    console.log('Raw service account (first 100 chars):', serviceAccountJson.substring(0, 100));
    
    let credentials;
    try {
      // Handle different possible formats of the secret
      let cleanJson = serviceAccountJson.trim();
      
      // Remove outer quotes if present
      if (cleanJson.startsWith('"') && cleanJson.endsWith('"')) {
        cleanJson = cleanJson.slice(1, -1);
      }
      
      // Unescape any escaped quotes
      cleanJson = cleanJson.replace(/\\"/g, '"');
      
      console.log('Cleaned JSON (first 100 chars):', cleanJson.substring(0, 100));
      
      credentials = JSON.parse(cleanJson);
      console.log('Successfully parsed service account JSON');
    } catch (parseError) {
      console.error('Failed to parse service account JSON:', parseError);
      console.error('Service account value:', serviceAccountJson);
      throw new Error(`Invalid service account JSON format: ${parseError.message}`);
    }
    
    // Create JWT token for Google Cloud Vision API
    const header = {
      alg: "RS256",
      typ: "JWT"
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    };

    // Import the private key
    const pemKey = credentials.private_key.replace(/\\n/g, '\n');
    const keyData = pemKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    
    const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    // Create JWT
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signatureInput)
    );
    
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const jwt = `${signatureInput}.${encodedSignature}`;

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Analyze image with Google Cloud Vision
    const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
            { type: 'IMAGE_PROPERTIES', maxResults: 1 }
          ]
        }]
      }),
    });

    const visionData = await visionResponse.json();
    console.log('Vision API response:', JSON.stringify(visionData, null, 2));

    if (!visionData.responses || !visionData.responses[0]) {
      throw new Error('No response from Vision API');
    }

    const response = visionData.responses[0];
    
    // Extract search terms from labels and objects
    const labels = response.labelAnnotations || [];
    const objects = response.localizedObjectAnnotations || [];
    const colors = response.imagePropertiesAnnotation?.dominantColors?.colors || [];

    const searchTerms = [
      ...labels.map((label: any) => label.description.toLowerCase()),
      ...objects.map((obj: any) => obj.name.toLowerCase())
    ].filter((term: string) => 
      // Filter for furniture-related terms
      term.includes('furniture') || 
      term.includes('chair') || 
      term.includes('table') || 
      term.includes('sofa') || 
      term.includes('bed') || 
      term.includes('shelf') || 
      term.includes('cabinet') || 
      term.includes('desk') || 
      term.includes('stool') || 
      term.includes('bookcase') ||
      term.includes('nightstand') ||
      term.includes('armchair') ||
      term.includes('wood') ||
      term.includes('wooden')
    );

    // Extract dominant colors
    const dominantColors = colors.slice(0, 3).map((color: any) => {
      const { red = 0, green = 0, blue = 0 } = color.color;
      return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
    });

    // Search products in database
    const supabase = createClient(
      "https://zdktmnzetynreahdpjim.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpka3RtbnpldHlucmVhaGRwamltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzkxOTYsImV4cCI6MjA3MTg1NTE5Nn0.LIHb2ksu58zLyHjs3axx-rglGSzbfWZyJuQbf8bpPkg"
    );

    let matchingProducts = [];

    if (searchTerms.length > 0) {
      try {
        // Try to search using the first few search terms
        const searchConditions = searchTerms.slice(0, 3).map(term =>
          `name.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%,type.ilike.%${term}%`
        ).join(',');

        const { data: products, error } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .or(searchConditions)
          .limit(10);

        if (error) {
          console.error('Database search error:', error);
          // Fallback: get some random active products
          const { data: fallbackProducts } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .limit(5);
          matchingProducts = fallbackProducts || [];
        } else {
          matchingProducts = products || [];
        }
      } catch (searchError) {
        console.error('Search failed, using fallback:', searchError);
        // Fallback: get some random active products
        const { data: fallbackProducts } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .limit(5);
        matchingProducts = fallbackProducts || [];
      }
    } else {
      // No search terms found, return some featured products
      const { data: fallbackProducts } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .limit(5);
      matchingProducts = fallbackProducts || [];
    }

    return new Response(JSON.stringify({
      searchTerms,
      dominantColors,
      matchingProducts,
      analysis: {
        labels: labels.slice(0, 5),
        objects: objects.slice(0, 5)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in image-search function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      searchTerms: [],
      matchingProducts: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});