-- Add custom commission override column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_commission_rate numeric DEFAULT NULL;

-- Update get_affiliate_tier to respect custom_commission_rate if set
CREATE OR REPLACE FUNCTION get_affiliate_tier(p_user_id uuid)
RETURNS TABLE (
  tier_name text,
  commission_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_count integer;
  v_custom_rate numeric;
BEGIN
  -- Check for custom commission override
  SELECT custom_commission_rate INTO v_custom_rate
  FROM profiles WHERE id = p_user_id;

  -- Get total ACTIVE referrals (must have at least one approved account request)
  SELECT COUNT(DISTINCT ar.referred_id) INTO v_referral_count
  FROM affiliate_referrals ar
  JOIN account_requests req ON req.user_id = ar.referred_id
  WHERE ar.referrer_id = p_user_id
  AND req.status = 'approved';

  -- If custom rate is set, override tier commission but still return the correct tier name
  IF v_custom_rate IS NOT NULL THEN
    RETURN QUERY
    SELECT
      t.name,
      v_custom_rate
    FROM affiliate_tiers t
    WHERE t.min_referrals <= v_referral_count
    ORDER BY t.min_referrals DESC
    LIMIT 1;
  ELSE
    RETURN QUERY
    SELECT
      t.name,
      t.commission_rate
    FROM affiliate_tiers t
    WHERE t.min_referrals <= v_referral_count
    ORDER BY t.min_referrals DESC
    LIMIT 1;
  END IF;
END;
$$;

-- Allow admins to update custom commission
CREATE POLICY "Admins can update affiliate custom commission"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Allow admins to update affiliate tier table
CREATE POLICY "Admins can manage affiliate tiers"
  ON affiliate_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );
