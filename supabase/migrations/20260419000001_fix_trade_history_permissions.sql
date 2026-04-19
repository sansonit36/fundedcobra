-- Fix permissions for trade_history to allow the PHP bridge (anon) to insert/upsert
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone with the anon key (like our bridge) to insert or update trades
-- In a production environment, you might want to restrict this further (e.g., via a secret header or service_role key)
CREATE POLICY "Allow anon and authenticated to insert trade history"
  ON trade_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon and authenticated to update trade history"
  ON trade_history FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Also ensure anon can select if needed, though usually only users need this
CREATE POLICY "Allow anon to select trade history"
  ON trade_history FOR SELECT
  TO anon
  USING (true);
