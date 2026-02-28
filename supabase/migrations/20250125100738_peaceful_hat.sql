-- Add breach_reason column to trading_accounts table
ALTER TABLE trading_accounts
ADD COLUMN IF NOT EXISTS breach_reason text;

-- Update existing breached accounts to have a default reason
UPDATE trading_accounts
SET breach_reason = 'Account breached due to rule violation'
WHERE status = 'breached'
AND breach_reason IS NULL;