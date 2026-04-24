const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://wdgqsltxvpjyghjuavvf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZ3FzbHR4dnBqeWdoanVhdnZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzY3MzU2MCwiZXhwIjoyMDUzMjQ5NTYwfQ.hp5lF6Bmz3CwGFOw1aT8FJE7M3d-P4DkZ_6-KyYK1ew';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260423170000_evaluation_reviews.sql');
    if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found at ${migrationPath}`);
    }
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration to Supabase...');
    
    // We'll use the exec_sql RPC which usually exists in these projects
    const { data, error } = await supabase.rpc('exec', { sql: migrationSQL });
    
    if (error) {
        console.error(`RPC Error:`, error);
        throw new Error(`Failed to apply migration via RPC: ${error.message}`);
    }
    
    console.log('\n✅ Migration applied successfully!');
    
  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
  }
}

applyMigration();
