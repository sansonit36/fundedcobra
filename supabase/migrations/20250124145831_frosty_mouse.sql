/*
  # Add Admin User

  1. Changes
    - Adds a new admin user with email admin@rivo.com
    - Sets up admin role and permissions
  
  2. Security
    - Password is hashed using bcrypt
    - User is assigned admin role
*/

-- Insert admin user if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'admin@rivo.com'
  ) THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      gen_random_uuid(),
      'admin@rivo.com',
      crypt('admin121', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin"}',
      now(),
      now(),
      'authenticated',
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;