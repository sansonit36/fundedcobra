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

-- Create admin policies using metadata from auth.users
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT (raw_user_meta_data->>'role')::text = 'admin' FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT (raw_user_meta_data->>'role')::text = 'admin' FROM auth.users WHERE id = auth.uid())
  );

-- Update get_users function to use auth.users metadata
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
  v_is_admin boolean;
BEGIN
  -- Check if user is admin using auth.users metadata
  SELECT (raw_user_meta_data->>'role')::text = 'admin' INTO v_is_admin
  FROM auth.users
  WHERE id = auth.uid();

  -- Return data based on admin status
  IF v_is_admin THEN
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