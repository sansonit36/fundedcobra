-- Update account_requests table to make transaction_hash optional
ALTER TABLE account_requests ALTER COLUMN transaction_hash DROP NOT NULL;

-- Update submitPaymentProof function to make transaction_hash optional
CREATE OR REPLACE FUNCTION submit_payment_proof(
  request_id uuid,
  screenshot_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_status text;
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
  
  -- Check if status is correct
  IF v_current_status != 'pending_payment' THEN
    RAISE EXCEPTION 'Invalid request status: %', v_current_status;
  END IF;
  
  -- Update request
  UPDATE account_requests
  SET 
    status = 'payment_submitted',
    payment_screenshot_url = screenshot_url
  WHERE id = request_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION submit_payment_proof(uuid, text) TO authenticated;