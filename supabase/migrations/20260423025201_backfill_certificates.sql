-- One-time script to sync all EXISTING certificates into trader_profiles

-- 1. Upsert missing profiles and update stats for existing users
INSERT INTO trader_profiles (id, total_payouts, total_certificates, updated_at)
SELECT 
  user_id, 
  COALESCE(SUM(payout_amount), 0), 
  COUNT(*), 
  NOW()
FROM payout_certificates
WHERE is_verified = TRUE
GROUP BY user_id
ON CONFLICT (id) DO UPDATE SET
  total_payouts = EXCLUDED.total_payouts,
  total_certificates = EXCLUDED.total_certificates,
  updated_at = EXCLUDED.updated_at;
