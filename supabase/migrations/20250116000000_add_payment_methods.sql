-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create settings table for global settings
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view enabled payment methods
CREATE POLICY "Anyone can view enabled payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (enabled = true);

-- Allow admins to manage payment methods
CREATE POLICY "Admins can manage payment methods"
  ON payment_methods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Allow anyone to view settings
CREATE POLICY "Anyone can view settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to update settings
CREATE POLICY "Admins can update settings"
  ON settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Insert default USD to PKR exchange rate
INSERT INTO settings (key, value) VALUES ('usd_to_pkr_rate', '288')
ON CONFLICT (key) DO NOTHING;

-- Insert default payment methods
INSERT INTO payment_methods (name, account_name, account_number, enabled) VALUES
('JazzCash', 'FundedCobra', '03001234567', true),
('Nayapay', 'FundedCobra', '03001234567', true),
('Bank Transfer', 'FundedCobra', 'PK12ABCD1234567890123456', true)
ON CONFLICT DO NOTHING;
