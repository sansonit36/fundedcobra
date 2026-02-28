-- Add available_payout column to trading_accounts table
ALTER TABLE trading_accounts
ADD COLUMN IF NOT EXISTS available_payout numeric DEFAULT 0;

-- Create function to update available payout
CREATE OR REPLACE FUNCTION update_available_payout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate available payout (50% of profit)
  NEW.available_payout := GREATEST(0, (NEW.equity - NEW.balance) * 0.5);
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update available payout
DROP TRIGGER IF EXISTS update_available_payout_trigger ON trading_accounts;
CREATE TRIGGER update_available_payout_trigger
  BEFORE UPDATE OF equity
  ON trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_available_payout();

-- Update existing records
UPDATE trading_accounts
SET available_payout = GREATEST(0, (equity - balance) * 0.5)
WHERE status = 'active';