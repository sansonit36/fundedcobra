/*
  # Affiliate System Implementation

  1. New Tables
    - affiliate_tiers: Defines commission tiers and requirements
    - affiliate_referrals: Tracks referral relationships
    - affiliate_earnings: Records commission earnings
    - affiliate_withdrawals: Manages withdrawal requests

  2. Profile Changes
    - Add referral code and referred_by fields to profiles
    
  3. Account Request Changes
    - Add affiliate commission tracking
    
  4. Security
    - Enable RLS on all new tables
    - Add appropriate policies for users and admins
*/

-- Create affiliate tiers table
CREATE TABLE affiliate_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  commission_rate numeric NOT NULL,
  min_referrals integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create affiliate referrals table
CREATE TABLE affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id),
  referred_id uuid REFERENCES profiles(id) UNIQUE,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

-- Create affiliate earnings table
CREATE TABLE affiliate_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES profiles(id),
  referral_id uuid REFERENCES profiles(id),
  amount numeric NOT NULL,
  source_transaction uuid REFERENCES account_requests(id),
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create affiliate withdrawals table
CREATE TABLE affiliate_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES profiles(id),
  amount numeric NOT NULL,
  wallet_address text NOT NULL,
  status text DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Add affiliate fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES profiles(id);

-- Add affiliate fields to account requests
ALTER TABLE account_requests 
ADD COLUMN IF NOT EXISTS affiliate_commission numeric,
ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES profiles(id);

-- Enable RLS
ALTER TABLE affiliate_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_withdrawals ENABLE ROW LEVEL SECURITY;

-- Create policies

-- Affiliate Tiers Policies
CREATE POLICY "Anyone can view affiliate tiers"
  ON affiliate_tiers FOR SELECT
  TO authenticated
  USING (true);

-- Affiliate Referrals Policies
CREATE POLICY "Users can view their own referrals"
  ON affiliate_referrals FOR SELECT
  TO authenticated
  USING (
    referrer_id = auth.uid() OR 
    referred_id = auth.uid()
  );

-- Affiliate Earnings Policies
CREATE POLICY "Users can view their own earnings"
  ON affiliate_earnings FOR SELECT
  TO authenticated
  USING (affiliate_id = auth.uid());

-- Affiliate Withdrawals Policies
CREATE POLICY "Users can view own withdrawals"
  ON affiliate_withdrawals FOR SELECT
  TO authenticated
  USING (affiliate_id = auth.uid());

CREATE POLICY "Users can create withdrawal requests"
  ON affiliate_withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (affiliate_id = auth.uid());

-- Admin Policies
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

-- Insert default affiliate tiers
INSERT INTO affiliate_tiers (name, commission_rate, min_referrals) VALUES
('Bronze', 10, 0),    -- 10% commission, no minimum referrals
('Silver', 15, 5),    -- 15% commission, 5+ referrals
('Gold', 20, 15),     -- 20% commission, 15+ referrals
('Diamond', 25, 30);  -- 25% commission, 30+ referrals

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