const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wdgqsltxvpjyghjuavvf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZ3FzbHR4dnBqeWdoanVhdnZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzY3MzU2MCwiZXhwIjoyMDUzMjQ5NTYwfQ.hp5lF6Bmz3CwGFOw1aT8FJE7M3d-P4DkZ_6-KyYK1ew';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function repairDatabase() {
  console.log('🚀 Starting Database Repair...');
  
  const sql = `
    ALTER TABLE account_rules ADD COLUMN IF NOT EXISTS bi_weekly_payout_enabled BOOLEAN DEFAULT false;
    ALTER TABLE account_rules ADD COLUMN IF NOT EXISTS drawdown_type TEXT DEFAULT 'static';
    ALTER TABLE account_rules ADD COLUMN IF NOT EXISTS drawdown_basis TEXT DEFAULT 'balance';
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
       console.error('❌ RPC Error:', error);
       // Try statement by statement fallback
       const statements = sql.split(';').filter(s => s.trim());
       for (const s of statements) {
         console.log(`Executing: ${s}...`);
         await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: s.trim() + ';' })
         });
       }
    } else {
      console.log('✅ Columns added successfully!');
    }
  } catch (err) {
    console.error('❌ Script Error:', err);
  }
}

repairDatabase();
