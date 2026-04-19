-- Function to securely link a new user to a referrer
-- Uses SECURITY DEFINER to bypass RLS on the profiles table
CREATE OR REPLACE FUNCTION public.link_referral(p_referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_referred_id uuid;
BEGIN
  -- Get the ID of the currently authenticated user
  v_referred_id := auth.uid();
  
  IF v_referred_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'auth.uid() is null');
  END IF;

  -- Find the referrer ID from the referral code
  SELECT id INTO v_referrer_id
  FROM profiles
  WHERE referral_code = p_referral_code;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'referrer not found', 'code', p_referral_code);
  END IF;

  -- Create the affiliate_referrals link if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM affiliate_referrals WHERE referred_id = v_referred_id
  ) THEN
    INSERT INTO affiliate_referrals (referrer_id, referred_id, status)
    VALUES (v_referrer_id, v_referred_id, 'active');
  END IF;
  
  -- Update the profiles table robustly using UPSERT
  -- This prevents race conditions where the auth trigger hasn't finished creating the profile
  INSERT INTO profiles (id, referred_by)
  VALUES (v_referred_id, v_referrer_id)
  ON CONFLICT (id) DO UPDATE
  SET referred_by = EXCLUDED.referred_by;

  RETURN jsonb_build_object('status', 'success', 'referrer_id', v_referrer_id, 'referred_id', v_referred_id);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.link_referral(text) TO authenticated;
