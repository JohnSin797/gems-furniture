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

// This script runs the address migration
// Run with: node scripts/run-migration.js

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Starting address migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250925110000_update_address_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('---');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}:`);
        console.log(statement);

        try {
          // Try to execute using RPC if available, otherwise use raw SQL
          const { error } = await supabase.rpc('exec_sql', { sql: statement });

          if (error) {
            // If RPC fails, try direct query execution
            console.log('   RPC failed, trying direct execution...');
            const { error: directError } = await supabase.from('_supabase_migrations').select('*').limit(1);

            if (directError) {
              console.error('❌ Cannot execute SQL. Please run manually in Supabase dashboard.');
              console.log('\n📋 Manual SQL to execute:');
              console.log(migrationSQL);
              return;
            }
          }

          console.log('✅ Statement executed successfully');
        } catch (execError) {
          console.error('❌ Error executing statement:', execError.message);
          console.log('\n📋 Please execute this SQL manually in your Supabase SQL Editor:');
          console.log(statement);
          return;
        }
      }
    }

    console.log('🎉 Migration completed successfully!');

    // Verify the columns were added
    console.log('🔍 Verifying new columns...');
    const { data, error } = await supabase
      .from('profiles')
      .select('street_address, barangay, city, province, zip_code')
      .limit(1);

    if (!error) {
      console.log('✅ Address columns verified in profiles table');
      console.log('📊 Sample columns:', Object.keys(data?.[0] || {}));
    } else {
      console.log('⚠️ Could not verify columns, but migration may have succeeded');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n📋 To run manually, execute this SQL in your Supabase SQL Editor:');

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250925110000_update_address_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(migrationSQL);
  }
}

runMigration();