-- Create screenshot_verifications table to log all AI verification attempts
CREATE TABLE IF NOT EXISTS screenshot_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  is_valid boolean NOT NULL,
  confidence numeric NOT NULL,
  ai_reason text,
  payment_type text,
  red_flags jsonb,
  expected_amount numeric,
  payment_method text,
  verified_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE screenshot_verifications ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all verifications
CREATE POLICY "Admins can view all verifications"
  ON screenshot_verifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_screenshot_verifications_user_id ON screenshot_verifications(user_id);
CREATE INDEX idx_screenshot_verifications_is_valid ON screenshot_verifications(is_valid);
CREATE INDEX idx_screenshot_verifications_created_at ON screenshot_verifications(created_at DESC);

-- Add suspension_reason field to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason text;
