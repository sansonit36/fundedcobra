-- Update get_affiliate_tier to only count referrals who have actually purchased an approved account
-- This fixes the issue where simple signups falsely push affiliates into higher tiers (e.g. Silver).

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
  -- Get total ACTIVE referrals (must have at least one approved account request)
  SELECT COUNT(DISTINCT ar.referred_id) INTO v_referral_count
  FROM affiliate_referrals ar
  JOIN account_requests req ON req.user_id = ar.referred_id
  WHERE ar.referrer_id = p_user_id
  AND req.status = 'approved';
  
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

-- Helper function to get exact count of active referrals for the frontend UI
CREATE OR REPLACE FUNCTION get_active_referral_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(DISTINCT ar.referred_id) INTO v_count
  FROM affiliate_referrals ar
  JOIN account_requests req ON req.user_id = ar.referred_id
  WHERE ar.referrer_id = p_user_id
  AND req.status = 'approved';
  
  RETURN v_count;
END;
$$;
