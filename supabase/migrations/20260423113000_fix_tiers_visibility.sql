-- Drop existing restrictive policies and replace with simpler admin ones
DROP POLICY IF EXISTS "Admins can manage affiliate tiers" ON affiliate_tiers;
DROP POLICY IF EXISTS "Anyone can view affiliate tiers" ON affiliate_tiers;

-- Allow all authenticated users to SEE tiers (needed for public affiliate page)
CREATE POLICY "Anyone can view affiliate tiers"
  ON affiliate_tiers FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to MANAGE tiers
CREATE POLICY "Admins can manage affiliate tiers"
  ON affiliate_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Ensure rows exist if they were missing or deleted
INSERT INTO affiliate_tiers (name, commission_rate, min_referrals)
SELECT 'Bronze', 5, 0 WHERE NOT EXISTS (SELECT 1 FROM affiliate_tiers WHERE name = 'Bronze');

INSERT INTO affiliate_tiers (name, commission_rate, min_referrals)
SELECT 'Silver', 8, 10 WHERE NOT EXISTS (SELECT 1 FROM affiliate_tiers WHERE name = 'Silver');

INSERT INTO affiliate_tiers (name, commission_rate, min_referrals)
SELECT 'Gold', 10, 25 WHERE NOT EXISTS (SELECT 1 FROM affiliate_tiers WHERE name = 'Gold');

INSERT INTO affiliate_tiers (name, commission_rate, min_referrals)
SELECT 'Diamond', 12, 50 WHERE NOT EXISTS (SELECT 1 FROM affiliate_tiers WHERE name = 'Diamond');

-- Double check updates in case they existed with old values
UPDATE affiliate_tiers SET commission_rate = 5,  min_referrals = 0  WHERE name = 'Bronze';
UPDATE affiliate_tiers SET commission_rate = 8,  min_referrals = 10 WHERE name = 'Silver';
UPDATE affiliate_tiers SET commission_rate = 10, min_referrals = 25 WHERE name = 'Gold';
UPDATE affiliate_tiers SET commission_rate = 12, min_referrals = 50 WHERE name = 'Diamond';
