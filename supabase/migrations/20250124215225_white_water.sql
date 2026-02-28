/*
  # Fix Payout Function Parameters

  1. Changes
    - Update function parameter names to match client calls
    - Keep function logic intact
    - Maintain security and permissions

  2. Security
    - Maintain SECURITY DEFINER
    - Keep search_path restrictions
*/

-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS get_available_payouts(uuid);
DROP FUNCTION IF EXISTS get_total_available_payout(uuid);

-- Function to calculate available payout amount
CREATE OR REPLACE FUNCTION get_available_payouts(user_id uuid)
RETURNS TABLE (
  id uuid,
  mt5_login text,
  initial_equity numeric,
  running_equity numeric,
  available_for_payout numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH account_stats AS (
    -- Get latest stats for each account
    SELECT 
      ta.id,
      ta.mt5_login,
      ta.balance as initial_equity,
      ta.equity as running_equity,
      COALESCE(ts.current_profit, 0) as current_profit,
      COALESCE(SUM(CASE WHEN pr.status = 'pending' THEN pr.amount ELSE 0 END), 0) as pending_payouts,
      COALESCE(SUM(CASE WHEN pr.status = 'approved' THEN pr.amount ELSE 0 END), 0) as total_paid
    FROM trading_accounts ta
    LEFT JOIN trading_stats ts ON ts.account_id = ta.id
    LEFT JOIN payout_requests pr ON pr.account_id = ta.id
    WHERE ta.user_id = user_id
    AND ta.status = 'active'
    GROUP BY ta.id, ta.mt5_login, ta.balance, ta.equity, ts.current_profit
  )
  SELECT
    as1.id,
    as1.mt5_login,
    as1.initial_equity,
    as1.running_equity,
    GREATEST(0, (as1.current_profit * 0.5) - as1.total_paid - as1.pending_payouts) as available_for_payout
  FROM account_stats as1;
END;
$$;

-- Function to get total available payout amount
CREATE OR REPLACE FUNCTION get_total_available_payout(user_id uuid)
RETURNS TABLE (available_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(ap.available_for_payout), 0) as available_amount
  FROM get_available_payouts(user_id) ap;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_available_payouts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_available_payout(uuid) TO authenticated;