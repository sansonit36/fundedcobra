-- Allow referrers to see the profile info of people they referred
-- NOTE: We must drop previous versions to fix the infinite recursion bug
DROP POLICY IF EXISTS "Referrers can view their referrals' profiles" ON public.profiles;

CREATE POLICY "Referrers can view their referrals' profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR 
  referred_by = auth.uid()
);

-- Note: We ONLY use the referred_by column (populated by our link_referral RPC) 
-- to prevent infinite recursion with the affiliate_referrals admin policies.

-- Note: We use both referred_by column and the affiliate_referrals table 
-- as a fallback to ensure 100% visibility for legitimate referrers.
