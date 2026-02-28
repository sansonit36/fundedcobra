-- Allow authenticated users to create referral relationships when signing up
CREATE POLICY "Allow users to create referrals on signup"
  ON affiliate_referrals FOR INSERT
  TO authenticated
  WITH CHECK (referred_id = auth.uid());

-- Also allow service role to insert (for admin operations)
CREATE POLICY "Allow service role to insert referrals"
  ON affiliate_referrals FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow admins to insert affiliate earnings when approving purchases
CREATE POLICY "Allow admins to insert affiliate earnings"
  ON affiliate_earnings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Allow service role to insert earnings
CREATE POLICY "Allow service role to insert earnings"
  ON affiliate_earnings FOR INSERT
  TO service_role
  WITH CHECK (true);
