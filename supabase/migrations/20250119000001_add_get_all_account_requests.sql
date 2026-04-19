-- CONSOLIDATED: Function to get all account requests with AI and Referral data
DROP FUNCTION IF EXISTS get_all_account_requests(text);
CREATE OR REPLACE FUNCTION get_all_account_requests(p_status text DEFAULT NULL)
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
  rejection_reason text,
  ai_confidence numeric,
  ai_reason text,
  ai_red_flags jsonb,
  referrer_name text,
  created_at timestamptz,
  processed_at timestamptz
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
    ar.rejection_reason,
    ar.ai_confidence,
    ar.ai_reason,
    ar.ai_red_flags,
    ref.name as referrer_name,
    ar.created_at,
    ar.processed_at
  FROM account_requests ar
  JOIN profiles p ON p.id = ar.user_id
  JOIN account_packages ap ON ap.id = ar.package_id
  LEFT JOIN profiles ref ON ref.id = p.referred_by
  WHERE 
    CASE 
      WHEN p_status IS NULL THEN true
      ELSE ar.status = p_status
    END
  ORDER BY ar.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_account_requests(text) TO authenticated;
