-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_account_purchase(uuid, text);
DROP FUNCTION IF EXISTS create_account_purchase(uuid, uuid, text);

-- Recreate function with correct parameter order
CREATE OR REPLACE FUNCTION create_account_purchase(
  package_id uuid,
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
  -- Log input parameters for debugging
  RAISE LOG 'create_account_purchase called with package_id: %, coupon_code: %', package_id, coupon_code;
  RAISE LOG 'auth.uid(): %', auth.uid();
  
  -- Get package details
  SELECT * INTO v_package
  FROM account_packages
  WHERE id = package_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid package ID: %', package_id;
  END IF;
  
  -- Log package details
  RAISE LOG 'Package found: %, price: %', v_package.name, v_package.price;
  
  -- Calculate discount if coupon provided
  v_discount := CASE 
    WHEN coupon_code IS NOT NULL THEN validate_coupon(coupon_code)
    ELSE 0
  END;
  
  RAISE LOG 'Discount calculated: %', v_discount;
  
  -- Create purchase request
  INSERT INTO account_requests (
    user_id,
    package_id,
    amount,
    coupon_code,
    status
  )
  VALUES (
    auth.uid(),
    package_id,
    v_package.price * (1 - v_discount),
    CASE WHEN v_discount > 0 THEN coupon_code ELSE NULL END,
    'pending_payment'
  )
  RETURNING id INTO v_request_id;
  
  RAISE LOG 'Account request created with ID: %', v_request_id;
  
  RETURN v_request_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_account_purchase(uuid, text) TO authenticated;