/*
  # Account Purchase Implementation

  1. Schema Changes
    - Add amount and coupon_code to account_requests
    - Add unique constraint on account_packages name
  
  2. Data
    - Insert default account packages
  
  3. Functions
    - Add coupon validation
    - Add purchase request creation
    - Add purchase processing
*/

-- Add new columns to account_requests
ALTER TABLE account_requests ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE account_requests ADD COLUMN IF NOT EXISTS coupon_code text;

-- Add unique constraint to account_packages name
ALTER TABLE account_packages ADD CONSTRAINT account_packages_name_key UNIQUE (name);

-- Insert default account packages
INSERT INTO account_packages (
  name,
  balance,
  price,
  trading_days,
  profit_target,
  daily_loss_limit,
  overall_loss_limit
)
VALUES 
  (
    '$3,500 Account',
    3500,
    117,
    30,
    10,
    420,
    1400
  ),
  (
    '$5,000 Account',
    5000,
    167,
    30,
    10,
    600,
    2000
  ),
  (
    '$10,000 Account',
    10000,
    320,
    30,
    10,
    1200,
    4000
  ),
  (
    '$25,000 Account',
    25000,
    640,
    30,
    10,
    3000,
    10000
  ),
  (
    '$50,000 Account',
    50000,
    993,
    30,
    10,
    6000,
    20000
  ),
  (
    '$100,000 Account',
    100000,
    1890,
    30,
    10,
    12000,
    40000
  )
ON CONFLICT (name) DO UPDATE
SET
  balance = EXCLUDED.balance,
  price = EXCLUDED.price,
  trading_days = EXCLUDED.trading_days,
  profit_target = EXCLUDED.profit_target,
  daily_loss_limit = EXCLUDED.daily_loss_limit,
  overall_loss_limit = EXCLUDED.overall_loss_limit;

-- Function to validate coupon code
CREATE OR REPLACE FUNCTION validate_coupon(
  code text
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For now, only implement WELCOME10 coupon
  IF UPPER(code) = 'WELCOME10' THEN
    RETURN 0.10; -- 10% discount
  END IF;
  
  RETURN 0;
END;
$$;

-- Function to create account purchase request
CREATE OR REPLACE FUNCTION create_account_purchase(
  package_id uuid,
  user_id uuid,
  coupon_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_package account_packages%ROWTYPE;
  v_discount numeric;
  v_request_id uuid;
BEGIN
  -- Get package details
  SELECT * INTO v_package
  FROM account_packages
  WHERE id = package_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid package ID';
  END IF;
  
  -- Calculate discount if coupon provided
  v_discount := CASE 
    WHEN coupon_code IS NOT NULL THEN validate_coupon(coupon_code)
    ELSE 0
  END;
  
  -- Create purchase request
  INSERT INTO account_requests (
    user_id,
    package_id,
    amount,
    coupon_code,
    status
  )
  VALUES (
    user_id,
    package_id,
    v_package.price * (1 - v_discount),
    CASE WHEN v_discount > 0 THEN coupon_code ELSE NULL END,
    'pending_payment'
  )
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;

-- Function to process account purchase
CREATE OR REPLACE FUNCTION process_account_purchase(
  request_id uuid,
  admin_id uuid,
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
  v_request account_requests%ROWTYPE;
  v_package account_packages%ROWTYPE;
  v_account_id uuid;
BEGIN
  -- Get request details
  SELECT * INTO v_request
  FROM account_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid request ID';
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_coupon(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_account_purchase(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION process_account_purchase(uuid, uuid, text, text, text) TO authenticated;