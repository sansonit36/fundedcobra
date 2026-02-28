-- First remove any existing admin users to ensure clean state
DELETE FROM auth.users WHERE email IN ('admin@admin.com', 'admin@rivo.com');

-- Create admin user with proper schema
DO $$ 
DECLARE
  v_user_id uuid;
BEGIN
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
END $$;