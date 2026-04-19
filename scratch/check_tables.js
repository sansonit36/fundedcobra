import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

async function diagnostic() {
  console.log("--- TABLE: account_data_extended ---");
  const { data: extData } = await supabase
    .from('account_data_extended')
    .select('*')
    .eq('mt5_id', 'LOCAL_TEST_888');
  console.log("Entries found:", extData?.length || 0);
  if (extData?.length > 0) console.log("Example Entry:", extData[0].mt5_id, extData[0].last_updated);

  console.log("\n--- TABLE: trading_accounts ---");
  const { data: accounts } = await supabase
    .from('trading_accounts')
    .select('id, mt5_login, status')
    .limit(5);
  console.log("Recent live accounts in DB:");
  accounts?.forEach(a => console.log(`- ${a.mt5_login} (${a.status})`));
}

diagnostic();
