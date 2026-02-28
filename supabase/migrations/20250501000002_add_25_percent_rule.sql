-- Add 25% rule flag to trading_accounts table
ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS has_25_percent_rule boolean DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_trading_accounts_25_percent_rule ON trading_accounts(has_25_percent_rule);

-- Add comment
COMMENT ON COLUMN trading_accounts.has_25_percent_rule IS 'When true, account gets 25% of profits instead of 50% for payouts';
