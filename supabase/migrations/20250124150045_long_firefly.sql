/*
  # Fix Admin Authentication

  1. Changes
    - Create admin user with proper password hashing
    - Ensure admin profile is created
    - Add proper metadata and role

  2. Security
    - Uses secure password hashing
    - Sets proper role and metadata
*/

-- Create admin user if not exists
DO $$ 
DECLARE
  v_user_id uuid;
BEGIN
  -- First check if user exists
  SELECT id INTO v_user_id
  FROM auth.users 
  WHERE email = 'admin@rivo.com';

  IF v_user_id IS NULL THEN
    -- Insert into auth.users with proper password hashing
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@rivo.com',
      crypt('admin121', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;

    -- Ensure profile exists with admin role
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
      'admin@rivo.com',
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