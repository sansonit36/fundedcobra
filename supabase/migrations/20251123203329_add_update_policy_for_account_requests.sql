-- Add UPDATE policy for account_requests table
CREATE POLICY "Users can update own requests"
  ON account_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());