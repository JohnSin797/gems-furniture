-- Create admin user through regular signup and assign admin role
DO $$
BEGIN
    -- Check if admin user already exists first
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@example.com') THEN
        -- For now, we'll need to create the user through the app sign-up
        -- This migration will just set up the admin role assignment trigger
        -- that will promote the first user with admin@example.com to admin
        
        -- Create a function to automatically assign admin role to admin@example.com
        CREATE OR REPLACE FUNCTION assign_admin_role()
        RETURNS TRIGGER AS $$
        BEGIN
            -- If the new user is admin@example.com, assign admin role
            IF NEW.email = 'admin@example.com' THEN
                -- Update their role from 'user' to 'admin'
                UPDATE public.user_roles 
                SET role = 'admin'::app_role 
                WHERE user_id = NEW.id;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Create trigger to auto-assign admin role
        DROP TRIGGER IF EXISTS auto_assign_admin_role ON public.profiles;
        CREATE TRIGGER auto_assign_admin_role
            AFTER INSERT ON public.profiles
            FOR EACH ROW
            EXECUTE FUNCTION assign_admin_role();
    END IF;
END $$;