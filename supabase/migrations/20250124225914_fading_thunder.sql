-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_account_purchase(uuid, uuid, text);

-- Recreate function with correct parameter order
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

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_account_purchase(uuid, uuid, text) TO authenticated;