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
  SELECT COALESCE(SUM(available_for_payout), 0) as available_amount
  FROM get_available_payouts(user_id);
END;
$$;

-- Function to create payout request with validation
CREATE OR REPLACE FUNCTION create_payout_request(
  p_account_id uuid,
  p_amount numeric,
  p_wallet_address text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available numeric;
  v_user_id uuid;
BEGIN
  -- Get user ID from account
  SELECT user_id INTO v_user_id
  FROM trading_accounts
  WHERE id = p_account_id;

  -- Verify account belongs to user
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get available payout amount
  SELECT available_for_payout INTO v_available
  FROM get_available_payouts(auth.uid())
  WHERE id = p_account_id;

  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'Requested amount exceeds available payout';
  END IF;

  -- Validate wallet address format (TRC20)
  IF NOT p_wallet_address ~ '^T[1-9A-HJ-NP-Za-km-z]{33}$' THEN
    RAISE EXCEPTION 'Invalid USDT-TRC20 wallet address';
  END IF;

  -- Create payout request
  INSERT INTO payout_requests (
    user_id,
    account_id,
    amount,
    wallet_address,
    status,
    created_at
  )
  VALUES (
    auth.uid(),
    p_account_id,
    p_amount,
    p_wallet_address,
    'pending',
    now()
  );
END;
$$;

-- Function to approve payout request
CREATE OR REPLACE FUNCTION approve_payout_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update request status
  UPDATE payout_requests
  SET 
    status = 'approved',
    processed_at = now()
  WHERE id = request_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or invalid status';
  END IF;
END;
$$;

-- Function to reject payout request
CREATE OR REPLACE FUNCTION reject_payout_request(
  request_id uuid,
  reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update request status
  UPDATE payout_requests
  SET 
    status = 'rejected',
    rejection_reason = reason,
    processed_at = now()
  WHERE id = request_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or invalid status';
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_available_payouts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_available_payout(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_payout_request(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_payout_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_payout_request(uuid, text) TO authenticated;