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
  v_profit_target numeric;
BEGIN
  -- Calculate current profit (running equity - initial equity)
  v_current_profit := NEW.equity - NEW.balance;
  
  -- Calculate profit target (10% of initial equity)
  v_profit_target := NEW.balance * 0.10;

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
  -- 1. Check if current profit meets target (10% of initial equity)
  -- 2. If met, take 50% of profit minus pending and approved payouts
  -- 3. If not met, available payout is 0
  NEW.available_payout := CASE 
    WHEN v_current_profit >= v_profit_target THEN
      GREATEST(0, (v_current_profit * 0.5) - v_pending_payouts - v_approved_payouts)
    ELSE 0
  END;

  -- Update trading stats
  UPDATE trading_stats
  SET current_profit = v_current_profit
  WHERE account_id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create trigger to automatically update available payout
CREATE TRIGGER update_available_payout_trigger
  BEFORE UPDATE OF equity
  ON trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_available_payout();

-- Update existing records to recalculate available payouts
UPDATE trading_accounts 
SET equity = equity 
WHERE status = 'active';