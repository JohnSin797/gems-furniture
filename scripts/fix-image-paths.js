import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.replace(/"/g, '').trim();
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixImagePaths() {
  try {
    console.log('🔧 Fixing image paths in products table...');

    // First, get all products with image URLs
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, image_url')
      .neq('image_url', null);

    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError);
      return;
    }

    if (!products || products.length === 0) {
      console.log('ℹ️ No products with image URLs found');
      return;
    }

    console.log(`📊 Found ${products.length} products to update`);

    // Update each product individually
    let updatedCount = 0;
    for (const product of products) {
      console.log(`Product ${product.id}: ${product.image_url}`);
      if (product.image_url && product.image_url.startsWith('/src/assets/')) {
        const newImageUrl = product.image_url.replace('/src/assets/', '/assets/');

        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: newImageUrl })
          .eq('id', product.id);

        if (updateError) {
          console.error(`❌ Error updating product ${product.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
    }

    console.log(`✅ Updated ${updatedCount} products successfully!`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

fixImagePaths();