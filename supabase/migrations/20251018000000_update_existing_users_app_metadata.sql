-- Update existing users to include role in app_metadata
UPDATE auth.users
SET app_metadata = COALESCE(app_metadata, '{}'::jsonb) || json_build_object('role', user_roles.role)::jsonb
FROM public.user_roles
WHERE auth.users.id = user_roles.user_id
AND (auth.users.app_metadata->>'role' IS NULL OR auth.users.app_metadata->>'role' = '');