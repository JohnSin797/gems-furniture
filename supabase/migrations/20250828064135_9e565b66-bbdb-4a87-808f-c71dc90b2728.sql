-- Ensure admin@example.com has admin role
INSERT INTO public.user_roles (user_id, role)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'admin@example.com'), 
  'admin'::app_role
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@example.com')
ON CONFLICT (user_id, role) DO NOTHING;