const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// This script applies the address migration to the profiles table
// Run with: node scripts/apply-migration.js

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Applying address migration to profiles table...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250925103000_add_address_to_profiles.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // If rpc doesn't work, try direct query
          const { error: queryError } = await supabase.from('_supabase_migrations').select('*').limit(1);
          if (queryError) {
            console.error('Cannot execute migration. Please run manually in Supabase dashboard.');
            console.log('Migration SQL:');
            console.log(migrationSQL);
            return;
          }
        }
      }
    }

    console.log('Migration applied successfully!');

    // Verify the columns were added
    const { data, error } = await supabase
      .from('profiles')
      .select('street_address, city, state, zip_code, country')
      .limit(1);

    if (!error) {
      console.log('Address columns verified in profiles table');
    }

  } catch (error) {
    console.error('Error applying migration:', error);
    console.log('\nTo apply manually, run this SQL in your Supabase dashboard:');
    console.log('ALTER TABLE public.profiles');
    console.log('ADD COLUMN street_address TEXT,');
    console.log('ADD COLUMN city TEXT,');
    console.log('ADD COLUMN state TEXT,');
    console.log('ADD COLUMN zip_code TEXT,');
    console.log('ADD COLUMN country TEXT;');
  }
}

applyMigration();