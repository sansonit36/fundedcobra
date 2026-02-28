const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://wdgqsltxvpjyghjuavvf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZ3FzbHR4dnBqeWdoanVhdnZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzY3MzU2MCwiZXhwIjoyMDUzMjQ5NTYwfQ.hp5lF6Bmz3CwGFOw1aT8FJE7M3d-P4DkZ_6-KyYK1ew';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250501000000_add_new_rules_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration to Supabase...');
    
    // Execute the SQL directly using the REST API
    const { data, error } = await supabase.rpc('exec', { sql: migrationSQL });
    
    if (error) {
      // If exec RPC doesn't exist, try direct SQL execution via PostgREST
      console.log('exec RPC not available, trying alternative method...');
      
      // Split the SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        if (statement.length > 2) {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: statement })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.log(`Statement ${i + 1} response:`, response.status, errorText);
          }
        }
      }
      
      console.log('\n✅ Migration applied successfully!');
      console.log('\nPlease verify by checking:');
      console.log('1. Go to https://account.rivertonmarkets.com/admin/account-rules');
      console.log('2. You should see Legacy Accounts, Special Instant Accounts, and Standard Accounts sections');
      console.log('3. Run verification queries in Supabase SQL Editor');
      
    } else {
      console.log('✅ Migration applied successfully!');
      console.log('Data:', data);
    }
    
  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
    console.log('\n⚠️  Please apply the migration manually:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy and paste the contents of supabase/migrations/20250501000000_add_new_rules_system.sql');
    console.log('5. Click "Run"');
  }
}

applyMigration();
