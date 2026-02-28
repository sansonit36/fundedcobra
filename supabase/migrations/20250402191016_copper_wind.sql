-- Create KYC verifications table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'kyc_verifications') THEN
    CREATE TABLE kyc_verifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'pending',
      rejection_reason text,
      approved_by uuid REFERENCES profiles(id),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'kyc_documents') THEN
    CREATE TABLE kyc_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      verification_id uuid REFERENCES kyc_verifications(id) ON DELETE CASCADE,
      type text NOT NULL, -- 'id_front', 'id_back', 'selfie'
      file_url text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'kyc_history') THEN
    CREATE TABLE kyc_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      verification_id uuid REFERENCES kyc_verifications(id) ON DELETE CASCADE,
      status text NOT NULL,
      reason text,
      changed_by uuid REFERENCES profiles(id),
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Add KYC status to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'kyc_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN kyc_status text DEFAULT 'unverified';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- KYC Verifications policies
  DROP POLICY IF EXISTS "Users can view own verification" ON kyc_verifications;
  DROP POLICY IF EXISTS "Users can create verification" ON kyc_verifications;
  DROP POLICY IF EXISTS "Admins can view all verifications" ON kyc_verifications;
  DROP POLICY IF EXISTS "Admins can update verifications" ON kyc_verifications;

  -- KYC Documents policies
  DROP POLICY IF EXISTS "Users can view own documents" ON kyc_documents;
  DROP POLICY IF EXISTS "Users can upload documents" ON kyc_documents;
  DROP POLICY IF EXISTS "Admins can view all documents" ON kyc_documents;

  -- KYC History policies
  DROP POLICY IF EXISTS "Users can view own history" ON kyc_history;
  DROP POLICY IF EXISTS "Admins can view all history" ON kyc_history;
  DROP POLICY IF EXISTS "Admins can create history" ON kyc_history;

  -- Storage policies
  DROP POLICY IF EXISTS "Users can upload own KYC documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read own KYC documents" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can read all KYC documents" ON storage.objects;
END $$;

-- Create policies

-- KYC Verifications Policies
CREATE POLICY "Users can view own verification"
  ON kyc_verifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create verification"
  ON kyc_verifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all verifications"
  ON kyc_verifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

CREATE POLICY "Admins can update verifications"
  ON kyc_verifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- KYC Documents Policies
CREATE POLICY "Users can view own documents"
  ON kyc_documents FOR SELECT
  TO authenticated
  USING (
    verification_id IN (
      SELECT id FROM kyc_verifications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents"
  ON kyc_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    verification_id IN (
      SELECT id FROM kyc_verifications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all documents"
  ON kyc_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- KYC History Policies
CREATE POLICY "Users can view own history"
  ON kyc_history FOR SELECT
  TO authenticated
  USING (
    verification_id IN (
      SELECT id FROM kyc_verifications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all history"
  ON kyc_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

CREATE POLICY "Admins can create history"
  ON kyc_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for KYC document storage
CREATE POLICY "Users can upload own KYC documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own KYC documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can read all KYC documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS update_kyc_status_trigger ON kyc_verifications;
DROP FUNCTION IF EXISTS update_kyc_status();

-- Function to update KYC status
CREATE OR REPLACE FUNCTION update_kyc_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update profile KYC status
  UPDATE profiles
  SET kyc_status = NEW.status
  WHERE id = NEW.user_id;

  -- Create history record
  INSERT INTO kyc_history (
    verification_id,
    status,
    reason,
    changed_by
  ) VALUES (
    NEW.id,
    NEW.status,
    NEW.rejection_reason,
    auth.uid()
  );

  RETURN NEW;
END;
$$;

-- Create trigger for KYC status updates
CREATE TRIGGER update_kyc_status_trigger
  AFTER UPDATE OF status ON kyc_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_kyc_status();

-- Grant necessary permissions
GRANT ALL ON kyc_verifications TO authenticated;
GRANT ALL ON kyc_documents TO authenticated;
GRANT ALL ON kyc_history TO authenticated;