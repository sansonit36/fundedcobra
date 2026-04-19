-- Fix approve_account_request function to include package_name
CREATE OR REPLACE FUNCTION approve_account_request(
  request_id uuid,
  mt5_login text,
  mt5_password text,
  mt5_server text DEFAULT 'FundedCobra-Live'
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

  -- Create trading account WITH package_name
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
    status,
    package_name,
    created_rule_version
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
    'active',
    v_package.name,
    'v2'
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

-- Update existing trading accounts that have NULL package_name
-- by looking up the package based on balance
-- NOTE: This migration is now superseded by 20250501000003 which properly handles legacy accounts
-- Keeping this for migration history but the logic has been improved
UPDATE trading_accounts ta
SET 
  package_name = ap.name
  -- Removed created_rule_version update - handled by 20250501000003
FROM account_packages ap
WHERE ta.package_name IS NULL
  AND ta.balance = ap.balance
  AND EXISTS (
    SELECT 1 FROM account_packages ap2
    WHERE ap2.balance = ta.balance
    GROUP BY ap2.balance
    HAVING COUNT(*) = 1
  );

-- For accounts where balance doesn't uniquely identify package,
-- try to match based on starting_balance
UPDATE trading_accounts ta
SET 
  package_name = ap.name
  -- Removed created_rule_version update - handled by 20250501000003
FROM account_packages ap
WHERE ta.package_name IS NULL
  AND ta.starting_balance = ap.balance
  AND EXISTS (
    SELECT 1 FROM account_packages ap2
    WHERE ap2.balance = ta.starting_balance
    GROUP BY ap2.balance
    HAVING COUNT(*) = 1
  );
