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
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      throw new Error('No image file provided');
    }

    // Convert image to base64
    const imageBytes = await imageFile.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));

    // Get Google Cloud service account from Supabase secrets
    const serviceAccount = Deno.env.get('GCLOUD_SERVICE_ACCOUNT');
    if (!serviceAccount) {
      throw new Error('Google Cloud service account not configured');
    }

    const credentials = JSON.parse(serviceAccount);
    
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
      const searchQuery = searchTerms.join(' | ');
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerms[0]}%,description.ilike.%${searchTerms[0]}%,category.ilike.%${searchTerms[0]}%,type.ilike.%${searchTerms[0]}%`)
        .limit(10);

      if (error) {
        console.error('Database search error:', error);
      } else {
        matchingProducts = products || [];
      }
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