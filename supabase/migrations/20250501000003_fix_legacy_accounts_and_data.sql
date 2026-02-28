-- Comprehensive fix for legacy accounts and data inconsistencies
-- All accounts created before Nov 18, 2025 should be marked as legacy

-- Step 1: Mark all accounts created before Nov 18, 2025 as legacy
-- EXCEPT Special Instant Accounts ($1,250, $3,500, $5,000) which should always be v2
UPDATE trading_accounts ta
SET created_rule_version = 'legacy'
FROM account_data_extended ade
WHERE ta.mt5_login = ade.mt5_id
  AND ta.created_at < '2025-11-18 00:00:00'
  AND (ta.created_rule_version IS NULL OR ta.created_rule_version != 'legacy')
  AND ade.initial_equity NOT IN (1250, 3500, 5000); -- Exclude Special Instant Accounts

-- Step 2: Fix package_name by matching mt5_login with account_data_extended initial_equity
UPDATE trading_accounts ta
SET package_name = CASE 
  -- Match based on initial_equity from account_data_extended
  WHEN ade.initial_equity = 1250 THEN '$1,250 Account'
  WHEN ade.initial_equity = 3500 THEN '$3,500 Account'
  WHEN ade.initial_equity = 5000 THEN '$5,000 Account'
  WHEN ade.initial_equity = 10000 THEN '$10,000 Account'
  WHEN ade.initial_equity = 25000 THEN '$25,000 Account'
  WHEN ade.initial_equity = 50000 THEN '$50,000 Account'
  WHEN ade.initial_equity = 100000 THEN '$100,000 Account'
  WHEN ade.initial_equity = 200000 THEN '$200,000 Account'
  ELSE ta.package_name
END
FROM account_data_extended ade
WHERE ta.mt5_login = ade.mt5_id
  AND (ta.package_name IS NULL OR ta.package_name = 'Unknown');

-- Step 3: For legacy accounts that still don't have package_name, try one more lookup
-- This handles edge cases where mt5_login might not match account_data_extended
UPDATE trading_accounts ta
SET package_name = ap.name
FROM account_packages ap
WHERE ta.created_rule_version = 'legacy'
  AND (ta.package_name IS NULL OR ta.package_name = 'Unknown')
  AND ta.balance = ap.balance;

-- Step 4: Mark new accounts (created on or after Nov 18, 2025) with v2 if not set
UPDATE trading_accounts
SET created_rule_version = 'v2'
WHERE created_at >= '2025-11-18 00:00:00'
  AND created_rule_version IS NULL;

-- Step 5: Add a comment to document the cutoff date
COMMENT ON COLUMN trading_accounts.created_rule_version IS 'Rule version: legacy for accounts before Nov 18 2025, v2 for after. Determines payout rules (10% vs 5% target)';

-- Optional: Create a view to easily identify legacy vs new accounts
CREATE OR REPLACE VIEW account_classification AS
SELECT 
  ta.id,
  ta.mt5_login,
  ta.user_id,
  ta.package_name,
  ta.created_rule_version,
  ta.created_at,
  CASE 
    WHEN ta.created_rule_version = 'legacy' THEN 'Legacy Account'
    WHEN ta.created_rule_version = 'v2' THEN 'Instant Account'
    ELSE 'Unclassified'
  END as account_type,
  CASE 
    WHEN ta.created_rule_version = 'legacy' THEN 10
    WHEN ta.created_rule_version = 'v2' THEN 5
    ELSE NULL
  END as profit_target_percent,
  ade.initial_equity,
  ade.running_equity
FROM trading_accounts ta
LEFT JOIN account_data_extended ade ON ta.mt5_login = ade.mt5_id;
