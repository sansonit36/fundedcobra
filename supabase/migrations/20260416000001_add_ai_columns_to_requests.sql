-- Add AI verification columns to account_requests
ALTER TABLE account_requests ADD COLUMN IF NOT EXISTS ai_confidence numeric;
ALTER TABLE account_requests ADD COLUMN IF NOT EXISTS ai_reason text;
ALTER TABLE account_requests ADD COLUMN IF NOT EXISTS ai_red_flags jsonb;

-- Update the get_all_account_requests function to include NEW columns
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
    ar.created_at,
    ar.processed_at
  FROM account_requests ar
  JOIN profiles p ON p.id = ar.user_id
  JOIN account_packages ap ON ap.id = ar.package_id
  WHERE 
    CASE 
      WHEN p_status IS NULL THEN true
      WHEN p_status = 'all' THEN true
      ELSE ar.status = p_status
    END
  ORDER BY ar.created_at DESC;
END;
$$;

-- Update submit_payment_proof function to handle AI verification and suspicious status
CREATE OR REPLACE FUNCTION submit_payment_proof(
  request_id uuid,
  screenshot_url text,
  p_ai_confidence numeric DEFAULT NULL,
  p_ai_reason text DEFAULT NULL,
  p_ai_red_flags jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_status text;
  v_new_status text;
BEGIN
  -- First check if the request exists and get current status
  SELECT user_id, status INTO v_user_id, v_current_status
  FROM account_requests
  WHERE id = request_id;
  
  -- Check if request exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  -- Check if request belongs to current user (unless admin)
  IF v_user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Request does not belong to user';
  END IF;
  
  -- Check if status is correct (Allow update if already submitted/suspicious to overwrite)
  IF v_current_status NOT IN ('pending_payment', 'payment_submitted', 'suspicious') THEN
    RAISE EXCEPTION 'Invalid request status: %', v_current_status;
  END IF;

  -- Determine new status based on AI confidence
  -- We use 40 as the threshold for 'suspicious'
  IF p_ai_confidence IS NOT NULL AND p_ai_confidence < 40 THEN
    v_new_status := 'suspicious';
  ELSE
    v_new_status := 'payment_submitted';
  END IF;
  
  -- Update request
  UPDATE account_requests
  SET 
    status = v_new_status,
    payment_screenshot_url = screenshot_url,
    ai_confidence = p_ai_confidence,
    ai_reason = p_ai_reason,
    ai_red_flags = p_ai_red_flags
  WHERE id = request_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION submit_payment_proof(uuid, text, numeric, text, jsonb) TO authenticated;
