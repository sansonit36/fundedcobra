-- Update affiliate tiers: lower commission rates, raise referral thresholds
-- Old: Bronze 10%/0, Silver 15%/5, Gold 20%/15, Diamond 25%/30
-- New: Bronze 5%/0, Silver 8%/10, Gold 10%/25, Diamond 12%/50

UPDATE affiliate_tiers SET commission_rate = 5, min_referrals = 0  WHERE name = 'Bronze';
UPDATE affiliate_tiers SET commission_rate = 8, min_referrals = 10 WHERE name = 'Silver';
UPDATE affiliate_tiers SET commission_rate = 10, min_referrals = 25 WHERE name = 'Gold';
UPDATE affiliate_tiers SET commission_rate = 12, min_referrals = 50 WHERE name = 'Diamond';
