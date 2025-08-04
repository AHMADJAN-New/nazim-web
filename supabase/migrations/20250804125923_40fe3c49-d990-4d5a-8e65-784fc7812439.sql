-- Fix the handle_new_user function separately to avoid type issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    selected_school_id UUID;
    requested_role TEXT;
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
    requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

    -- If it's a super admin, create profile directly
    IF requested_role = 'super_admin' THEN
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (NEW.id, NEW.email, user_full_name, requested_role::user_role);
        
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
            requested_role::user_role,
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
$function$;