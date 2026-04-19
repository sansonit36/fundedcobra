-- Fix Trade History RLS for Admins and Users

-- 1. Drop old policies
DROP POLICY IF EXISTS "Users can view own trade history" ON trade_history;
DROP POLICY IF EXISTS "Admins can manage all trade history" ON trade_history;

-- 2. Create User Policy (View own)
CREATE POLICY "Users can view own trade history"
  ON trade_history FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trading_accounts
    WHERE trading_accounts.mt5_login = trade_history.mt5_id
    AND trading_accounts.user_id = auth.uid()
  ));

-- 3. Create Admin Policy (View ALL)
-- NOTE: This checks if the user's role in the profiles table or JWT is admin
CREATE POLICY "Admins can view all trade history"
  ON trade_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR 
    (auth.jwt() ->> 'role' = 'admin')
  );

-- 4. Create Bridge Policy (Insert only)
-- Ensure the anon bridge can still insert
CREATE POLICY "Bridge can insert trades"
  ON trade_history FOR INSERT
  TO anon
  WITH CHECK (true);
