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

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Update getUsers function to handle admin access
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
BEGIN
  -- Check if user is admin
  IF auth.jwt() ->> 'role' = 'admin' THEN
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