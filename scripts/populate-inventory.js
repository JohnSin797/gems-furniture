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
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateInventory() {
  try {
    console.log('🚀 Populating inventory for existing products...');

    // Get all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name');

    if (productsError) throw productsError;

    console.log(`📋 Found ${products.length} products`);

    // Get existing inventory records
    const { data: existingInventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('product_id');

    if (inventoryError) throw inventoryError;

    const existingProductIds = new Set(existingInventory.map(inv => inv.product_id));

    // Find products without inventory
    const productsWithoutInventory = products.filter(product => !existingProductIds.has(product.id));

    console.log(`📋 Found ${productsWithoutInventory.length} products without inventory records`);

    if (productsWithoutInventory.length === 0) {
      console.log('✅ All products already have inventory records');
      return;
    }

    // Create inventory records for products without them
    const inventoryRecords = productsWithoutInventory.map(product => ({
      product_id: product.id,
      quantity: 0, // Default to 0
      reorder_level: 5, // Default reorder level
      reserved_quantity: 0,
    }));

    const { error: insertError } = await supabase
      .from('inventory')
      .insert(inventoryRecords);

    if (insertError) throw insertError;

    console.log(`✅ Created inventory records for ${productsWithoutInventory.length} products`);

    // Verify
    const { data: verifyData, error: verifyError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        inventory (
          quantity
        )
      `)
      .limit(5);

    if (!verifyError) {
      console.log('🔍 Sample products with inventory:');
      verifyData.forEach(product => {
        console.log(`  ${product.name}: ${product.inventory?.[0]?.quantity || 0} units`);
      });
    }

    console.log('🎉 Inventory population completed successfully!');

  } catch (error) {
    console.error('❌ Error populating inventory:', error);
  }
}

populateInventory();