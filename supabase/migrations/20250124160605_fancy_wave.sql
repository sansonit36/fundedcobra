/*
  # Account Approvals Functions

  1. New Functions
    - get_pending_account_requests: Fetches pending account requests with user and package details
    - approve_account_request: Approves account request and creates MT5 account
    - reject_account_request: Rejects account request with reason

  2. Security
    - All functions are SECURITY DEFINER
    - Admin-only access
*/

-- Function to get pending account requests
CREATE OR REPLACE FUNCTION get_pending_account_requests()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  package_name text,
  package_balance numeric,
  package_fee numeric,
  amount numeric,
  status text,
  transaction_hash text,
  payment_screenshot_url text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    ar.id,
    ar.user_id,
    p.name as user_name,
    p.email as user_email,
    ap.name as package_name,
    ap.balance as package_balance,
    ap.price as package_fee,
    ar.amount,
    ar.status,
    ar.transaction_hash,
    ar.payment_screenshot_url,
    ar.created_at
  FROM account_requests ar
  JOIN profiles p ON p.id = ar.user_id
  JOIN account_packages ap ON ap.id = ar.package_id
  WHERE ar.status = 'payment_submitted'
  ORDER BY ar.created_at DESC;
END;
$$;

-- Function to approve account request
CREATE OR REPLACE FUNCTION approve_account_request(
  request_id uuid,
  mt5_login text,
  mt5_password text,
  mt5_server text DEFAULT 'RivertonMarkets-Live'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_request account_requests%ROWTYPE;
  v_package account_packages%ROWTYPE;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get request details
  SELECT * INTO v_request
  FROM account_requests
  WHERE id = request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.status != 'payment_submitted' THEN
    RAISE EXCEPTION 'Invalid request status';
  END IF;

  -- Get package details
  SELECT * INTO v_package
  FROM account_packages
  WHERE id = v_request.package_id;

  -- Create trading account
  INSERT INTO trading_accounts (
    user_id,
    mt5_login,
    mt5_password,
    mt5_server,
    balance,
    equity,
    starting_balance,
    daily_loss_limit,
    overall_loss_limit,
    status
  )
  VALUES (
    v_request.user_id,
    mt5_login,
    mt5_password,
    mt5_server,
    v_package.balance,
    v_package.balance,
    v_package.balance,
    v_package.daily_loss_limit,
    v_package.overall_loss_limit,
    'active'
  )
  RETURNING id INTO v_account_id;

  -- Update request status
  UPDATE account_requests
  SET 
    status = 'approved',
    processed_at = now()
  WHERE id = request_id;

  RETURN v_account_id;
END;
$$;

-- Function to reject account request
CREATE OR REPLACE FUNCTION reject_account_request(
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
  UPDATE account_requests
  SET 
    status = 'rejected',
    rejection_reason = reason,
    processed_at = now()
  WHERE id = request_id
  AND status = 'payment_submitted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or invalid status';
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_pending_account_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION approve_account_request(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_account_request(uuid, text) TO authenticated;