-- Create default admin account
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
);

-- Get the admin user ID for the profile and role
WITH admin_user AS (
  SELECT id FROM auth.users WHERE email = 'admin@example.com'
)
INSERT INTO public.profiles (user_id, first_name, last_name, email)
SELECT id, 'Admin', 'User', 'admin@example.com'
FROM admin_user;

-- Assign admin role
WITH admin_user AS (
  SELECT id FROM auth.users WHERE email = 'admin@example.com'
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM admin_user;