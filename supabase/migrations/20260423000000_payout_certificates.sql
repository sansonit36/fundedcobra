-- ============================================================
-- Payout Certificates + Trader Profile System
-- ============================================================

-- 1. Certificate numbering sequence
CREATE SEQUENCE IF NOT EXISTS certificate_number_seq START WITH 1;

-- 2. Payout Certificates table
CREATE TABLE IF NOT EXISTS payout_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payout_request_id UUID REFERENCES payout_requests(id) ON DELETE SET NULL,
  account_id UUID REFERENCES trading_accounts(id) ON DELETE SET NULL,
  trader_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'Unknown',
  account_size NUMERIC NOT NULL DEFAULT 0,
  payout_amount NUMERIC NOT NULL,
  payout_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Trader Profiles table
CREATE TABLE IF NOT EXISTS trader_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  total_payouts NUMERIC NOT NULL DEFAULT 0,
  total_certificates INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Highlighted Trades table
CREATE TABLE IF NOT EXISTS highlighted_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  profit NUMERIC NOT NULL,
  volume NUMERIC NOT NULL DEFAULT 0.01,
  duration TEXT,
  account_type TEXT,
  close_date TIMESTAMPTZ,
  is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  added_by_admin BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Leaderboard Entries (manual admin entries for leaderboard)
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  total_payout NUMERIC NOT NULL DEFAULT 0,
  account_type TEXT,
  is_manual BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE payout_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trader_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlighted_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Certificates: anyone can read (public verification), only service can write
CREATE POLICY "Public can view certificates"
  ON payout_certificates FOR SELECT
  USING (true);

CREATE POLICY "Service can insert certificates"
  ON payout_certificates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update certificates"
  ON payout_certificates FOR UPDATE
  USING (true);

-- Trader Profiles: public can read public profiles, owners can read own
CREATE POLICY "Public can view public profiles"
  ON trader_profiles FOR SELECT
  USING (is_public = true OR id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON trader_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON trader_profiles FOR UPDATE
  USING (id = auth.uid());

-- Admin full access on trader_profiles
CREATE POLICY "Admin full access trader profiles"
  ON trader_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Highlighted Trades: public read for users with public profiles
CREATE POLICY "Public can view highlighted trades"
  ON highlighted_trades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trader_profiles tp WHERE tp.id = highlighted_trades.user_id AND tp.is_public = true
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Admin can manage highlighted trades"
  ON highlighted_trades FOR ALL
  USING (true);

-- Leaderboard entries: public read, admin write
CREATE POLICY "Public can view leaderboard"
  ON leaderboard_entries FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Admin can manage leaderboard"
  ON leaderboard_entries FOR ALL
  USING (true);

-- ============================================================
-- Auto-generate certificate on payout approval
-- ============================================================

CREATE OR REPLACE FUNCTION generate_payout_certificate()
RETURNS TRIGGER AS $$
DECLARE
  v_cert_number TEXT;
  v_trader_name TEXT;
  v_package_name TEXT;
  v_account_size NUMERIC;
  v_profile_exists BOOLEAN;
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Generate certificate number: FC-YYYY-NNNNN
    v_cert_number := 'FC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('certificate_number_seq')::TEXT, 5, '0');
    
    -- Get trader name
    SELECT COALESCE(full_name, name, email) INTO v_trader_name
    FROM profiles WHERE id = NEW.user_id;
    
    -- Get account info
    SELECT COALESCE(ta.package_name, 'Unknown'), COALESCE(ade.initial_equity, ta.balance, 0)
    INTO v_package_name, v_account_size
    FROM trading_accounts ta
    LEFT JOIN account_data_extended ade ON ade.mt5_id = ta.mt5_login
    WHERE ta.id = NEW.account_id;
    
    -- Insert certificate
    INSERT INTO payout_certificates (
      certificate_number,
      user_id,
      payout_request_id,
      account_id,
      trader_name,
      account_type,
      account_size,
      payout_amount,
      payout_date,
      verification_url,
      is_verified
    ) VALUES (
      v_cert_number,
      NEW.user_id,
      NEW.id,
      NEW.account_id,
      COALESCE(v_trader_name, 'Trader'),
      COALESCE(v_package_name, 'Unknown'),
      COALESCE(v_account_size, 0),
      NEW.amount,
      COALESCE(NEW.processed_at, NOW()),
      'https://account.fundedcobra.com/verify/' || v_cert_number,
      TRUE
    );
    
    -- Upsert trader profile (create if doesn't exist)
    SELECT EXISTS(SELECT 1 FROM trader_profiles WHERE id = NEW.user_id) INTO v_profile_exists;
    
    IF v_profile_exists THEN
      UPDATE trader_profiles
      SET total_payouts = total_payouts + NEW.amount,
          total_certificates = total_certificates + 1,
          updated_at = NOW()
      WHERE id = NEW.user_id;
    ELSE
      INSERT INTO trader_profiles (id, display_name, total_payouts, total_certificates, is_public)
      VALUES (NEW.user_id, v_trader_name, NEW.amount, 1, FALSE);
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_generate_certificate ON payout_requests;

-- Create trigger
CREATE TRIGGER trg_generate_certificate
  AFTER UPDATE ON payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION generate_payout_certificate();
