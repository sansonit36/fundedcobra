/*
  # Add Account Requests Insert Policy

  1. Security Changes
    - Add policy to allow users to insert their own account requests
*/

-- Add policy to allow users to insert account requests
CREATE POLICY "Users can insert own requests"
  ON account_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add policy to allow users to update their own requests
CREATE POLICY "Users can update own requests"
  ON account_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);