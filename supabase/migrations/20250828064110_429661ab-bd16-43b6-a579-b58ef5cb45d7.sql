-- Create default admin account only if it doesn't exist
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin already exists
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@example.com';
  
  -- If admin doesn't exist, create it
  IF admin_user_id IS NULL THEN
    -- Insert admin user
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_user_meta_data,
      aud,
      role
    ) VALUES (
      gen_random_uuid(),
      'admin@example.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"first_name": "Admin", "last_name": "User"}',
      'authenticated',
      'authenticated'
    ) RETURNING id INTO admin_user_id;

    -- Insert profile
    INSERT INTO public.profiles (user_id, first_name, last_name, email)
    VALUES (admin_user_id, 'Admin', 'User', 'admin@example.com');

    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role);
  ELSE
    -- If admin exists, make sure they have admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;