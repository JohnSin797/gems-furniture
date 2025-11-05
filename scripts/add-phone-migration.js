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
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Adding phone_number column to profiles table...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251105000000_add_phone_number_to_profiles.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('---');

    // Execute the SQL directly
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Error executing migration:', error.message);
      console.log('\n📋 Please execute this SQL manually in your Supabase SQL Editor:');
      console.log(migrationSQL);
      return;
    }

    console.log('✅ Migration completed successfully!');

    // Verify the column was added
    console.log('🔍 Verifying phone_number column...');
    const { error: verifyError } = await supabase
      .from('profiles')
      .select('phone_number')
      .limit(1);

    if (!verifyError) {
      console.log('✅ phone_number column verified in profiles table');
    } else {
      console.log('⚠️ Could not verify column, but migration may have succeeded');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n📋 To run manually, execute this SQL in your Supabase SQL Editor:');
    console.log('ALTER TABLE profiles ADD COLUMN phone_number TEXT;');
  }
}

runMigration();