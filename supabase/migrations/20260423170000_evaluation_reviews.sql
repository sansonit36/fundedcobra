-- Create evaluation_reviews table to track manual review requests
CREATE TABLE IF NOT EXISTS evaluation_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES trading_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  current_phase integer NOT NULL,
  target_profit numeric NOT NULL,
  actual_profit numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE evaluation_reviews ENABLE ROW LEVEL SECURITY;

-- Users can view their own reviews
CREATE POLICY "Users can view their own evaluation reviews"
  ON evaluation_reviews FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own reviews
CREATE POLICY "Users can insert their own evaluation reviews"
  ON evaluation_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all
CREATE POLICY "Admins can view all evaluation reviews"
  ON evaluation_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can update
CREATE POLICY "Admins can update evaluation reviews"
  ON evaluation_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
