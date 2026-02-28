/*
  # Fix Admin Authentication Schema

  1. Changes
    - Create admin user with correct Supabase auth schema
    - Set proper metadata and role information
    - Ensure admin profile exists

  2. Security
    - Uses proper password hashing
    - Sets correct user metadata and role
*/

-- Create admin user if not exists
DO $$ 
DECLARE
  v_user_id uuid;
BEGIN
  -- First check if user exists
  SELECT id INTO v_user_id
  FROM auth.users 
  WHERE email = 'admin@admin.com';

  IF v_user_id IS NULL THEN
    -- Insert into auth.users with proper Supabase auth schema
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
      role
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
      'authenticated'
    )
    RETURNING id INTO v_user_id;

    -- Create admin profile
    INSERT INTO public.profiles (
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
  END IF;
END $$;