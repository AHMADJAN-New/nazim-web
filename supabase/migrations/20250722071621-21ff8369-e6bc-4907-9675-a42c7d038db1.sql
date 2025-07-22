-- Create auth monitoring and helper functions

-- Create auth monitoring table
CREATE TABLE IF NOT EXISTS public.auth_monitoring (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    event_data jsonb,
    error_message text,
    user_email text,
    ip_address inet,
    user_agent text,
    resolved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on auth monitoring
ALTER TABLE public.auth_monitoring ENABLE ROW LEVEL SECURITY;

-- Create policy for auth monitoring
DROP POLICY IF EXISTS "Only admins can view auth monitoring" ON public.auth_monitoring;
CREATE POLICY "Only admins can view auth monitoring" 
ON public.auth_monitoring 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Create function to log auth events
CREATE OR REPLACE FUNCTION public.log_auth_event(
    event_type text,
    event_data jsonb DEFAULT '{}',
    error_message text DEFAULT NULL,
    user_email text DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO public.auth_monitoring (
        event_type,
        event_data,
        error_message,
        user_email
    ) VALUES (
        event_type,
        event_data,
        error_message,
        user_email
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Silent fail to prevent auth blocking
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Improve handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    selected_school_id UUID;
    requested_role user_role;
    user_full_name TEXT;
BEGIN
    -- Log new user registration attempt
    PERFORM public.log_auth_event(
        'user_registration_attempt',
        jsonb_build_object(
            'user_id', NEW.id,
            'email', NEW.email,
            'metadata', NEW.raw_user_meta_data
        ),
        NULL,
        NEW.email
    );

    -- Extract data from user metadata
    selected_school_id := (NEW.raw_user_meta_data->>'school_id')::UUID;
    requested_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

    -- If it's a super admin, create profile directly
    IF requested_role = 'super_admin' THEN
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (NEW.id, NEW.email, user_full_name, requested_role);
        
        PERFORM public.log_auth_event(
            'super_admin_profile_created',
            jsonb_build_object('user_id', NEW.id, 'email', NEW.email),
            NULL,
            NEW.email
        );
    ELSE
        -- For other roles, create pending registration
        INSERT INTO public.pending_registrations (
            user_id, 
            school_id, 
            requested_role, 
            full_name, 
            email,
            phone,
            additional_info
        ) VALUES (
            NEW.id,
            selected_school_id,
            requested_role,
            user_full_name,
            NEW.email,
            NEW.raw_user_meta_data->>'phone',
            NEW.raw_user_meta_data
        );
        
        PERFORM public.log_auth_event(
            'pending_registration_created',
            jsonb_build_object('user_id', NEW.id, 'email', NEW.email, 'role', requested_role),
            NULL,
            NEW.email
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        PERFORM public.log_auth_event(
            'user_registration_error',
            jsonb_build_object('user_id', NEW.id, 'email', NEW.email),
            SQLERRM,
            NEW.email
        );
        -- Re-raise the error
        RAISE;
END;
$$;