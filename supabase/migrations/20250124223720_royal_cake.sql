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
BEGIN
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

  -- Calculate available payout (50% of profit minus pending and approved payouts)
  NEW.available_payout := GREATEST(0, 
    ((NEW.equity - NEW.balance) * 0.5) - v_pending_payouts - v_approved_payouts
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
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, equity, balance FROM trading_accounts WHERE status = 'active' LOOP
    UPDATE trading_accounts 
    SET available_payout = (
      SELECT GREATEST(0, 
        ((t.equity - t.balance) * 0.5) - 
        COALESCE((
          SELECT SUM(amount) 
          FROM payout_requests 
          WHERE account_id = t.id 
          AND status = 'pending'
        ), 0) -
        COALESCE((
          SELECT SUM(amount) 
          FROM payout_requests 
          WHERE account_id = t.id 
          AND status = 'approved'
        ), 0)
      )
      FROM trading_accounts t
      WHERE t.id = r.id
    )
    WHERE id = r.id;
  END LOOP;
END $$;