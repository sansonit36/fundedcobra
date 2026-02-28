-- Add new rules system for prop firm accounts
-- This migration implements the flexible rules system with account-specific configurations
--
-- IMPORTANT: LEGACY ACCOUNT PROTECTION
-- ========================================
-- All EXISTING trading accounts will AUTOMATICALLY use 'legacy' rules:
-- - 10% profit target (old system)
-- - 2 minimum trading days per week
-- - 12% daily drawdown, 40% overall drawdown
-- - Weekly payouts only
--
-- NEW accounts created AFTER this migration will use 'v2' rules:
-- - 5% withdrawal target (special accounts: $1,250, $3,500, $5,000)
-- - Account-specific rules (daily payouts for special accounts)
-- - 8% daily drawdown, 12% overall drawdown
-- - Configurable via admin panel
--
-- The rule_version is set at account creation and NEVER changes.
-- This ensures old accounts remain unaffected by future rule updates.

-- Create account_rules table to store rule configurations
CREATE TABLE IF NOT EXISTS account_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_package_name text NOT NULL UNIQUE,
  withdrawal_target_percent numeric NOT NULL DEFAULT 5,
  has_profit_target boolean NOT NULL DEFAULT true,
  profit_target_percent numeric DEFAULT 10,
  minimum_trading_days integer DEFAULT 4,
  has_minimum_trading_days boolean NOT NULL DEFAULT true,
  daily_payout_enabled boolean NOT NULL DEFAULT false,
  weekly_payout_enabled boolean NOT NULL DEFAULT true,
  minimum_withdrawal_amount numeric DEFAULT 20,
  single_trade_limit_percent numeric DEFAULT 25,
  daily_drawdown_percent numeric NOT NULL DEFAULT 8,
  overall_drawdown_percent numeric NOT NULL DEFAULT 12,
  rule_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE account_rules ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view rules
CREATE POLICY "Anyone can view account rules"
  ON account_rules FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage rules
CREATE POLICY "Admins can manage account rules"
  ON account_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Add $1,250 account package
INSERT INTO account_packages (
  name,
  balance,
  price,
  trading_days,
  profit_target,
  daily_loss_limit,
  overall_loss_limit
)
VALUES (
  '$1,250 Account',
  1250,
  50,
  0,
  5,
  100,
  150
)
ON CONFLICT (name) DO UPDATE
SET
  balance = EXCLUDED.balance,
  price = EXCLUDED.price,
  trading_days = EXCLUDED.trading_days,
  profit_target = EXCLUDED.profit_target,
  daily_loss_limit = EXCLUDED.daily_loss_limit,
  overall_loss_limit = EXCLUDED.overall_loss_limit;

-- Insert default rules for special instant accounts ($1,250, $3,500, $5,000)
-- These are v2 rules and will NOT affect legacy accounts
INSERT INTO account_rules (
  account_package_name,
  withdrawal_target_percent,
  has_profit_target,
  profit_target_percent,
  minimum_trading_days,
  has_minimum_trading_days,
  daily_payout_enabled,
  weekly_payout_enabled,
  minimum_withdrawal_amount,
  single_trade_limit_percent,
  daily_drawdown_percent,
  overall_drawdown_percent,
  rule_description,
  rule_version
)
VALUES
  (
    '$1,250 Account',
    5,
    false,
    NULL,
    0,
    false,
    true,
    true,
    50,
    25,
    8,
    12,
    'Special instant account with no profit target. Withdrawal target: 5%. Daily payouts enabled. Minimum withdrawal: $20.',
    'v2'
  ),
  (
    '$3,500 Account',
    5,
    false,
    NULL,
    0,
    false,
    true,
    true,
    20,
    25,
    8,
    12,
    'Special instant account with no profit target. Withdrawal target: 5%. Daily payouts enabled. Minimum withdrawal: $20.',
    'v2'
  ),
  (
    '$5,000 Account',
    5,
    false,
    NULL,
    0,
    false,
    true,
    true,
    20,
    25,
    8,
    12,
    'Special instant account with no profit target. Withdrawal target: 5%. Daily payouts enabled. Minimum withdrawal: $20.',
    'v2'
  ),
  (
    '$10,000 Account',
    5,
    false,
    NULL,
    4,
    true,
    false,
    true,
    20,
    25,
    8,
    12,
    'Standard account with withdrawal target: 5%. Weekly payouts. Minimum 4 trading days required.',
    'v2'
  ),
  (
    '$25,000 Account',
    5,
    false,
    NULL,
    4,
    true,
    false,
    true,
    20,
    25,
    8,
    12,
    'Standard account with withdrawal target: 5%. Weekly payouts. Minimum 4 trading days required.',
    'v2'
  ),
  (
    '$50,000 Account',
    5,
    false,
    NULL,
    4,
    true,
    false,
    true,
    20,
    25,
    8,
    12,
    'Standard account with withdrawal target: 5%. Weekly payouts. Minimum 4 trading days required.',
    'v2'
  ),
  (
    '$100,000 Account',
    5,
    false,
    NULL,
    4,
    true,
    false,
    true,
    20,
    25,
    8,
    12,
    'Standard account with withdrawal target: 5%. Weekly payouts. Minimum 4 trading days required.',
    'v2'
  )
ON CONFLICT (account_package_name) DO UPDATE
SET
  withdrawal_target_percent = EXCLUDED.withdrawal_target_percent,
  has_profit_target = EXCLUDED.has_profit_target,
  profit_target_percent = EXCLUDED.profit_target_percent,
  minimum_trading_days = EXCLUDED.minimum_trading_days,
  has_minimum_trading_days = EXCLUDED.has_minimum_trading_days,
  daily_payout_enabled = EXCLUDED.daily_payout_enabled,
  weekly_payout_enabled = EXCLUDED.weekly_payout_enabled,
  minimum_withdrawal_amount = EXCLUDED.minimum_withdrawal_amount,
  single_trade_limit_percent = EXCLUDED.single_trade_limit_percent,
  daily_drawdown_percent = EXCLUDED.daily_drawdown_percent,
  overall_drawdown_percent = EXCLUDED.overall_drawdown_percent,
  rule_description = EXCLUDED.rule_description,
  updated_at = now();

-- Add package_name and rule_version to trading_accounts for easy rule lookup
ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS package_name text;
ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS rule_version text DEFAULT 'legacy';
ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS created_rule_version text DEFAULT 'legacy';

-- Create index for rule_version
CREATE INDEX IF NOT EXISTS idx_trading_accounts_rule_version ON trading_accounts(rule_version);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_account_rules_package_name ON account_rules(account_package_name);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_package_name ON trading_accounts(package_name);

-- Add rule_version to account_rules table
ALTER TABLE account_rules ADD COLUMN IF NOT EXISTS rule_version text DEFAULT 'v2' NOT NULL;

-- Create index for rule_version in account_rules
CREATE INDEX IF NOT EXISTS idx_account_rules_version ON account_rules(rule_version);

-- Insert LEGACY rules for old accounts (10% profit target system)
INSERT INTO account_rules (
  account_package_name,
  withdrawal_target_percent,
  has_profit_target,
  profit_target_percent,
  minimum_trading_days,
  has_minimum_trading_days,
  daily_payout_enabled,
  weekly_payout_enabled,
  minimum_withdrawal_amount,
  single_trade_limit_percent,
  daily_drawdown_percent,
  overall_drawdown_percent,
  rule_description,
  rule_version
)
VALUES
  (
    'LEGACY_ALL_ACCOUNTS',
    10,
    true,
    10,
    2,
    true,
    false,
    true,
    20,
    25,
    12,
    40,
    'Legacy account rules: 10% profit target, weekly payouts, 2 minimum trading days, 12% daily drawdown, 40% overall drawdown. These rules apply to all accounts created before the v2 rule system.',
    'legacy'
  )
ON CONFLICT DO NOTHING;

-- Create function to get account rules
CREATE OR REPLACE FUNCTION get_account_rules(p_package_name text)
RETURNS TABLE (
  withdrawal_target_percent numeric,
  has_profit_target boolean,
  profit_target_percent numeric,
  minimum_trading_days integer,
  has_minimum_trading_days boolean,
  daily_payout_enabled boolean,
  weekly_payout_enabled boolean,
  minimum_withdrawal_amount numeric,
  single_trade_limit_percent numeric,
  daily_drawdown_percent numeric,
  overall_drawdown_percent numeric,
  rule_description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.withdrawal_target_percent,
    ar.has_profit_target,
    ar.profit_target_percent,
    ar.minimum_trading_days,
    ar.has_minimum_trading_days,
    ar.daily_payout_enabled,
    ar.weekly_payout_enabled,
    ar.minimum_withdrawal_amount,
    ar.single_trade_limit_percent,
    ar.daily_drawdown_percent,
    ar.overall_drawdown_percent,
    ar.rule_description
  FROM account_rules ar
  WHERE ar.account_package_name = p_package_name;
END;
$$;

-- Update available payout calculation to use new withdrawal target with version support
CREATE OR REPLACE FUNCTION update_available_payout_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_payouts numeric;
  v_approved_payouts numeric;
  v_current_profit numeric;
  v_withdrawal_target numeric;
  v_withdrawal_target_percent numeric;
  v_minimum_withdrawal numeric;
  v_rule_version text;
BEGIN
  -- Calculate current profit (running equity - initial equity)
  v_current_profit := NEW.equity - NEW.balance;
  
  -- Get rule version (use created_rule_version which never changes)
  v_rule_version := COALESCE(NEW.created_rule_version, NEW.rule_version, 'legacy');
  
  -- Get withdrawal target percent and minimum from account rules based on version
  IF v_rule_version = 'legacy' THEN
    -- Legacy accounts: use old LEGACY_ALL_ACCOUNTS rules
    SELECT 
      ar.withdrawal_target_percent,
      ar.minimum_withdrawal_amount
    INTO 
      v_withdrawal_target_percent,
      v_minimum_withdrawal
    FROM account_rules ar
    WHERE ar.account_package_name = 'LEGACY_ALL_ACCOUNTS'
    AND ar.rule_version = 'legacy';
  ELSE
    -- New accounts: use package-specific rules
    SELECT 
      ar.withdrawal_target_percent,
      ar.minimum_withdrawal_amount
    INTO 
      v_withdrawal_target_percent,
      v_minimum_withdrawal
    FROM account_rules ar
    WHERE ar.account_package_name = NEW.package_name
    AND ar.rule_version = 'v2';
  END IF;
  
  -- If no rules found, use legacy defaults
  IF v_withdrawal_target_percent IS NULL THEN
    v_withdrawal_target_percent := 10;
  END IF;
  
  IF v_minimum_withdrawal IS NULL THEN
    v_minimum_withdrawal := 0;
  END IF;
  
  -- Calculate withdrawal target based on initial equity
  v_withdrawal_target := NEW.balance * (v_withdrawal_target_percent / 100);

  -- Get pending payouts
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_payouts
  FROM payout_requests
  WHERE account_id = NEW.id
  AND status = 'pending';

  -- Get approved payouts
  SELECT COALESCE(SUM(amount), 0) INTO v_approved_payouts
  FROM payout_requests
  WHERE account_id = NEW.id
  AND status = 'approved';

  -- Calculate available payout:
  -- 1. Check if current profit meets withdrawal target
  -- 2. If met, take 50% of profit minus pending and approved payouts
  -- 3. If below minimum withdrawal amount, set to 0
  NEW.available_payout := CASE 
    WHEN v_current_profit >= v_withdrawal_target THEN
      CASE 
        WHEN GREATEST(0, (v_current_profit * 0.5) - v_pending_payouts - v_approved_payouts) >= v_minimum_withdrawal THEN
          GREATEST(0, (v_current_profit * 0.5) - v_pending_payouts - v_approved_payouts)
        ELSE 0
      END
    ELSE 0
  END;

  RETURN NEW;
END;
$$;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS update_available_payout_trigger ON trading_accounts;

CREATE TRIGGER update_available_payout_trigger
  BEFORE UPDATE OF equity
  ON trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_available_payout_v2();

-- Update existing records (existing accounts stay on legacy by default)
UPDATE trading_accounts 
SET 
  rule_version = 'legacy',
  created_rule_version = 'legacy',
  equity = equity 
WHERE rule_version IS NULL OR created_rule_version IS NULL;

-- Grant necessary permissions
GRANT ALL ON account_rules TO authenticated;

-- VERIFICATION QUERIES (Run these to check rule assignment)
-- =====================================================
-- Check all accounts and their rule versions:
-- SELECT id, mt5_login, package_name, rule_version, created_rule_version, created_at 
-- FROM trading_accounts 
-- ORDER BY created_at DESC;
--
-- Count accounts by rule version:
-- SELECT rule_version, COUNT(*) as account_count 
-- FROM trading_accounts 
-- GROUP BY rule_version;
--
-- View all rule configurations:
-- SELECT account_package_name, rule_version, withdrawal_target_percent, 
--        has_profit_target, daily_payout_enabled, minimum_trading_days
-- FROM account_rules
-- ORDER BY rule_version, account_package_name;

-- Create function to set rule version for new accounts
CREATE OR REPLACE FUNCTION set_new_account_rule_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- New accounts get v2 rules, set both rule_version and created_rule_version
  NEW.rule_version := 'v2';
  NEW.created_rule_version := 'v2';
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set rule version on new account creation
DROP TRIGGER IF EXISTS set_rule_version_on_insert ON trading_accounts;
CREATE TRIGGER set_rule_version_on_insert
  BEFORE INSERT ON trading_accounts
  FOR EACH ROW
  WHEN (NEW.created_rule_version IS NULL)
  EXECUTE FUNCTION set_new_account_rule_version();
