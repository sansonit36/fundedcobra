-- Function to automatically sync payout_certificates to trader_profiles
CREATE OR REPLACE FUNCTION sync_trader_profile_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  new_total_payouts NUMERIC;
  new_total_certs INT;
BEGIN
  -- Determine which user's profile we need to update
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;

  -- Calculate the sum and count
  SELECT 
    COALESCE(SUM(payout_amount), 0),
    COUNT(*)
  INTO 
    new_total_payouts,
    new_total_certs
  FROM payout_certificates
  WHERE user_id = target_user_id AND is_verified = TRUE;

  -- Upsert into trader_profiles
  INSERT INTO trader_profiles (id, total_payouts, total_certificates, updated_at)
  VALUES (target_user_id, new_total_payouts, new_total_certs, NOW())
  ON CONFLICT (id) DO UPDATE
  SET 
    total_payouts = EXCLUDED.total_payouts,
    total_certificates = EXCLUDED.total_certificates,
    updated_at = NOW();

  RETURN NULL; -- For AFTER trigger, return value is ignored
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_sync_trader_profile_stats ON payout_certificates;

CREATE TRIGGER trigger_sync_trader_profile_stats
AFTER INSERT OR UPDATE OR DELETE ON payout_certificates
FOR EACH ROW
EXECUTE FUNCTION sync_trader_profile_stats();
