-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_available_payout_trigger ON trading_accounts;
DROP FUNCTION IF EXISTS update_available_payout();

-- Create function to update available payout
CREATE OR REPLACE FUNCTION update_available_payout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_payouts numeric;
  v_approved_payouts numeric;
  v_current_profit numeric;
BEGIN
  -- Calculate current profit (running equity - initial equity)
  v_current_profit := NEW.equity - NEW.balance;

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
  -- 1. Take 50% of current profit (running equity - initial equity)
  -- 2. Subtract pending and approved payouts
  -- 3. Ensure it never goes below 0
  NEW.available_payout := GREATEST(0, 
    (v_current_profit * 0.5) - v_pending_payouts - v_approved_payouts
  );

  RETURN NEW;
END;
$$;

-- Create trigger to automatically update available payout
CREATE TRIGGER update_available_payout_trigger
  BEFORE UPDATE OF equity
  ON trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_available_payout();

-- Update existing records
UPDATE trading_accounts 
SET equity = equity 
WHERE status = 'active';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payout_requests_account_status 
ON payout_requests(account_id, status);