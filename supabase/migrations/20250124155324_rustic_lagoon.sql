-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create new policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create admin policies using profiles table
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.status = 'active'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.status = 'active'
    )
  );

-- Update get_users function to use profiles table
CREATE OR REPLACE FUNCTION get_users()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_user_status text;
BEGIN
  -- Get user's role and status
  SELECT role, status INTO v_user_role, v_user_status
  FROM profiles
  WHERE id = auth.uid();

  -- Return data based on role
  IF v_user_role = 'admin' AND v_user_status = 'active' THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.email,
      p.name,
      p.role,
      p.status,
      p.created_at,
      p.updated_at
    FROM profiles p
    ORDER BY p.created_at DESC;
  ELSE
    -- Return only the user's own profile
    RETURN QUERY
    SELECT 
      p.id,
      p.email,
      p.name,
      p.role,
      p.status,
      p.created_at,
      p.updated_at
    FROM profiles p
    WHERE p.id = auth.uid();
  END IF;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_users() TO authenticated;

-- Recreate admin user with proper role and status
DO $$ 
DECLARE
  v_user_id uuid;
BEGIN
  -- Delete existing admin user if exists
  DELETE FROM auth.users WHERE email = 'admin@admin.com';
  
  -- Create new admin user
  INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data,
    raw_app_meta_data,
    is_super_admin,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    aud,
    role,
    instance_id,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  VALUES (
    gen_random_uuid(),
    'admin@admin.com',
    jsonb_build_object('role', 'admin'),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    TRUE,
    crypt('admin123', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '00000000-0000-0000-0000-000000000000',
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Create admin profile
  INSERT INTO profiles (
    id,
    email,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    'admin@admin.com',
    'admin',
    'active',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role = 'admin',
    status = 'active',
    updated_at = now();
END $$;