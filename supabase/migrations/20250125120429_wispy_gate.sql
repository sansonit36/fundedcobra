-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS generate_referral_code();
DROP FUNCTION IF EXISTS get_affiliate_tier(uuid);
DROP FUNCTION IF EXISTS get_affiliate_earnings(uuid);

-- Create or update affiliate fields in profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_code text,
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES profiles(id);

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_referral_code_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

-- Create or update affiliate fields in account requests
ALTER TABLE account_requests 
ADD COLUMN IF NOT EXISTS affiliate_commission numeric,
ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES profiles(id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    -- Generate random 8 character code
    v_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code exists
    SELECT EXISTS (
      SELECT 1 FROM profiles WHERE referral_code = v_code
    ) INTO v_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$;

-- Function to get affiliate tier
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
BEGIN
  -- Get total active referrals
  SELECT COUNT(*) INTO v_referral_count
  FROM affiliate_referrals
  WHERE referrer_id = p_user_id
  AND status = 'active';
  
  -- Return appropriate tier
  RETURN QUERY
  SELECT 
    t.name,
    t.commission_rate
  FROM affiliate_tiers t
  WHERE t.min_referrals <= v_referral_count
  ORDER BY t.min_referrals DESC
  LIMIT 1;
END;
$$;

-- Function to calculate total affiliate earnings
CREATE OR REPLACE FUNCTION get_affiliate_earnings(p_user_id uuid)
RETURNS TABLE (
  total_earnings numeric,
  pending_earnings numeric,
  available_for_withdrawal numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0) as total_earnings,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earnings,
    COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) -
    COALESCE((
      SELECT SUM(amount)
      FROM affiliate_withdrawals
      WHERE affiliate_id = p_user_id
      AND status IN ('pending', 'approved')
    ), 0) as available_for_withdrawal
  FROM affiliate_earnings
  WHERE affiliate_id = p_user_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION get_affiliate_tier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_affiliate_earnings(uuid) TO authenticated;

-- Update RLS policies
DO $$ 
BEGIN
  -- Affiliate Tiers Policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view affiliate tiers'
  ) THEN
    CREATE POLICY "Anyone can view affiliate tiers"
      ON affiliate_tiers FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Affiliate Referrals Policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own referrals'
  ) THEN
    CREATE POLICY "Users can view their own referrals"
      ON affiliate_referrals FOR SELECT
      TO authenticated
      USING (
        referrer_id = auth.uid() OR 
        referred_id = auth.uid()
      );
  END IF;

  -- Affiliate Earnings Policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own earnings'
  ) THEN
    CREATE POLICY "Users can view their own earnings"
      ON affiliate_earnings FOR SELECT
      TO authenticated
      USING (affiliate_id = auth.uid());
  END IF;

  -- Affiliate Withdrawals Policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own withdrawals'
  ) THEN
    CREATE POLICY "Users can view own withdrawals"
      ON affiliate_withdrawals FOR SELECT
      TO authenticated
      USING (affiliate_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can create withdrawal requests'
  ) THEN
    CREATE POLICY "Users can create withdrawal requests"
      ON affiliate_withdrawals FOR INSERT
      TO authenticated
      WITH CHECK (affiliate_id = auth.uid());
  END IF;

  -- Admin Policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all affiliate data'
  ) THEN
    CREATE POLICY "Admins can view all affiliate data"
      ON affiliate_referrals FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
          AND status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all earnings'
  ) THEN
    CREATE POLICY "Admins can view all earnings"
      ON affiliate_earnings FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
          AND status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage withdrawals'
  ) THEN
    CREATE POLICY "Admins can manage withdrawals"
      ON affiliate_withdrawals FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
          AND status = 'active'
        )
      );
  END IF;
END $$;