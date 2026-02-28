-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all trading accounts" ON trading_accounts;
DROP POLICY IF EXISTS "Admins can update all trading accounts" ON trading_accounts;

-- Create admin policies for trading accounts
CREATE POLICY "Admins can view all trading accounts"
  ON trading_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

CREATE POLICY "Admins can update all trading accounts"
  ON trading_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );