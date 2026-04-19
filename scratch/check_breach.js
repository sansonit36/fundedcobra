import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env parser
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(
  env['VITE_SUPABASE_URL'],
  env['VITE_SUPABASE_ANON_KEY']
);

async function checkAccount() {
  console.log("Checking ALL accounts for mt5_login: LOCAL_TEST_888");
  
  const { data: accounts, error } = await supabase
    .from('trading_accounts')
    .select('*')
    .eq('mt5_login', 'LOCAL_TEST_888');

  if (error) {
    console.error("Error fetching accounts:", error.message);
    return;
  }

  console.log(`Found ${accounts.length} account(s):`);
  accounts.forEach((acc, idx) => {
    console.log(`\n--- Account ${idx + 1} ---`);
    console.log("- ID:", acc.id);
    console.log("- Status:", acc.status);
    console.log("- Package:", acc.package_name);
    console.log("- Breach Reason:", acc.breach_reason);
    console.log("- Created At:", acc.created_at);
  });

  if (accounts.length > 0) {
    const { data: trades, error: tradeError } = await supabase
      .from('trade_history')
      .select('*')
      .eq('mt5_id', 'LOCAL_TEST_888')
      .order('created_at', { ascending: false });

    if (tradeError) {
      console.error("Error fetching trades:", tradeError.message);
    } else {
      console.log(`\nFound ${trades?.length || 0} trades for this mt5_id.`);
      trades?.slice(0, 3).forEach((trade, idx) => {
        console.log(`\n- Trade ${idx + 1} (Ticket: ${trade.ticket}):`);
        console.log("  Open Time:", trade.open_time);
        console.log("  Close Time:", trade.close_time);
        const open = new Date(trade.open_time).getTime();
        const close = new Date(trade.close_time).getTime();
        console.log("  Duration:", (close - open) / 1000, "seconds");
      });
    }
  }
}

checkAccount();
