-- Update notifications insert policy
-- Allow users and admins to insert notifications for any user

-- Drop existing insert policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create new insert policy for users and admins
CREATE POLICY "Users and admins can insert notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (
        has_role(auth.uid(), 'user'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role)
    );