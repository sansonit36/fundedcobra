-- Update validate_coupon function to include BLACKFRIDAY50
CREATE OR REPLACE FUNCTION validate_coupon(
  code text
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for available coupons
  CASE UPPER(code)
    WHEN 'WELCOME10' THEN RETURN 0.10;      -- 10% discount
    WHEN 'MY20' THEN RETURN 0.20;           -- 20% discount
    WHEN 'GET25' THEN RETURN 0.25;          -- 25% discount
    WHEN 'BLACKFRIDAY50' THEN RETURN 0.50;  -- 50% discount
    ELSE RETURN 0;
  END CASE;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION validate_coupon(text) TO authenticated;
