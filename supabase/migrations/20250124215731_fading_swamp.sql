/*
  # Fix Payout Calculation Functions

  1. Changes
    - Fix ambiguous user_id references
    - Add proper table aliases
    - Improve profit calculation logic
    - Add proper join conditions
    - Maintain security settings

  2. Security
    - Keep SECURITY DEFINER
    - Maintain search_path restrictions
*/

-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS get_available_payouts(uuid);
DROP FUNCTION IF EXISTS get_total_available_payout(uuid);

-- Function to calculate available payout amount
CREATE OR REPLACE FUNCTION get_available_payouts(p_user_id uuid)
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
    -- Get latest stats for each account with proper joins
    SELECT 
      ta.id,
      ta.mt5_login,
      ta.balance as initial_equity,
      ta.equity as running_equity,
      COALESCE(ts.current_profit, 0) as current_profit,
      COALESCE(
        (
          SELECT SUM(pr.amount)
          FROM payout_requests pr
          WHERE pr.account_id = ta.id
          AND pr.user_id = p_user_id
          AND pr.status = 'pending'
        ), 
        0
      ) as pending_payouts,
      COALESCE(
        (
          SELECT SUM(pr.amount)
          FROM payout_requests pr
          WHERE pr.account_id = ta.id
          AND pr.user_id = p_user_id
          AND pr.status = 'approved'
        ), 
        0
      ) as total_paid
    FROM trading_accounts ta
    LEFT JOIN trading_stats ts ON ts.account_id = ta.id
    WHERE ta.user_id = p_user_id
    AND ta.status = 'active'
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
CREATE OR REPLACE FUNCTION get_total_available_payout(p_user_id uuid)
RETURNS TABLE (available_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(ap.available_for_payout), 0) as available_amount
  FROM get_available_payouts(p_user_id) ap;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_available_payouts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_available_payout(uuid) TO authenticated;