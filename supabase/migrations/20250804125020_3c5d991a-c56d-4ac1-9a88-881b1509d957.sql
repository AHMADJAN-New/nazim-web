-- Fix database security issues identified by linter

-- 1. Fix all function search paths for security
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS user_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_attendance_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    student_record RECORD;
    attendance_record RECORD;
BEGIN
    -- Find student by student_id or device_user_id
    SELECT s.id, s.class_id INTO student_record
    FROM public.students s
    JOIN public.profiles p ON s.user_id = p.id
    WHERE s.student_id = NEW.student_id OR s.student_id = NEW.device_user_id;

    IF student_record.id IS NOT NULL THEN
        -- Check if attendance already exists for this date
        SELECT * INTO attendance_record
        FROM public.attendance
        WHERE student_id = student_record.id 
        AND class_id = student_record.class_id
        AND date = NEW.timestamp::date;

        IF attendance_record.id IS NULL THEN
            -- Create new attendance record
            INSERT INTO public.attendance (
                student_id,
                class_id,
                date,
                status,
                marked_by,
                remarks
            ) VALUES (
                student_record.id,
                student_record.class_id,
                NEW.timestamp::date,
                'present'::attendance_status,
                (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1), -- System admin
                'Auto-marked from device: ' || (SELECT device_name FROM public.attendance_devices WHERE id = NEW.device_id)
            );
        ELSE
            -- Update existing record if it was absent
            UPDATE public.attendance
            SET status = 'present'::attendance_status,
                remarks = COALESCE(remarks, '') || ' | Auto-updated from device'
            WHERE id = attendance_record.id AND status = 'absent'::attendance_status;
        END IF;

        -- Mark log as processed
        UPDATE public.attendance_logs
        SET processed = true
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_registration(registration_id uuid, approver_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    registration_record RECORD;
BEGIN
    -- Get the registration record
    SELECT * INTO registration_record 
    FROM public.pending_registrations 
    WHERE id = registration_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Create the user profile
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        school_id,
        phone
    ) VALUES (
        registration_record.user_id,
        registration_record.email,
        registration_record.full_name,
        registration_record.requested_role,
        registration_record.school_id,
        registration_record.additional_info->>'phone'
    );
    
    -- Update registration status
    UPDATE public.pending_registrations 
    SET 
        status = 'approved',
        reviewed_at = now(),
        reviewed_by = approver_id,
        updated_at = now()
    WHERE id = registration_id;
    
    RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_registration(registration_id uuid, approver_id uuid, reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
    UPDATE public.pending_registrations 
    SET 
        status = 'rejected',
        reviewed_at = now(),
        reviewed_by = approver_id,
        rejection_reason = reason,
        updated_at = now()
    WHERE id = registration_id AND status = 'pending';
    
    RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.password_reset_tokens 
  WHERE expires_at < now() OR used = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_auth_event(event_type text, event_data jsonb DEFAULT '{}'::jsonb, error_message text DEFAULT NULL::text, user_email text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

-- 2. Add password strength and account security enhancements
CREATE TABLE IF NOT EXISTS public.user_security_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    failed_login_attempts integer DEFAULT 0,
    last_failed_login timestamp with time zone,
    account_locked_until timestamp with time zone,
    password_changed_at timestamp with time zone DEFAULT now(),
    requires_password_change boolean DEFAULT false,
    two_factor_enabled boolean DEFAULT false,
    backup_codes text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS on user security settings
ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user security settings
CREATE POLICY "Users can view their own security settings" 
    ON public.user_security_settings 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own security settings" 
    ON public.user_security_settings 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "System can manage security settings" 
    ON public.user_security_settings 
    FOR ALL 
    USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Function to handle failed login attempts
CREATE OR REPLACE FUNCTION public.handle_failed_login(user_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    user_id_val uuid;
    current_attempts integer;
    lock_duration interval := '15 minutes';
    max_attempts integer := 5;
    result jsonb;
BEGIN
    -- Get user ID from email
    SELECT id INTO user_id_val FROM auth.users WHERE email = user_email;
    
    IF user_id_val IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- Insert or update security settings
    INSERT INTO public.user_security_settings (user_id, failed_login_attempts, last_failed_login)
    VALUES (user_id_val, 1, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        failed_login_attempts = CASE 
            WHEN user_security_settings.account_locked_until > now() THEN user_security_settings.failed_login_attempts
            ELSE user_security_settings.failed_login_attempts + 1
        END,
        last_failed_login = now(),
        account_locked_until = CASE 
            WHEN user_security_settings.failed_login_attempts + 1 >= max_attempts 
            THEN now() + lock_duration
            ELSE user_security_settings.account_locked_until
        END;
    
    -- Get current attempts
    SELECT failed_login_attempts INTO current_attempts 
    FROM public.user_security_settings 
    WHERE user_id = user_id_val;
    
    -- Return result
    IF current_attempts >= max_attempts THEN
        result := jsonb_build_object(
            'locked', true,
            'attempts', current_attempts,
            'lockUntil', (SELECT account_locked_until FROM public.user_security_settings WHERE user_id = user_id_val)
        );
    ELSE
        result := jsonb_build_object(
            'locked', false,
            'attempts', current_attempts,
            'remaining', max_attempts - current_attempts
        );
    END IF;
    
    RETURN result;
END;
$function$;

-- Function to reset failed login attempts on successful login
CREATE OR REPLACE FUNCTION public.reset_failed_login_attempts(user_id_val uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
    UPDATE public.user_security_settings 
    SET 
        failed_login_attempts = 0,
        last_failed_login = NULL,
        account_locked_until = NULL
    WHERE user_id = user_id_val;
END;
$function$;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    user_id_val uuid;
    locked_until timestamp with time zone;
BEGIN
    SELECT id INTO user_id_val FROM auth.users WHERE email = user_email;
    
    IF user_id_val IS NULL THEN
        RETURN false;
    END IF;
    
    SELECT account_locked_until INTO locked_until 
    FROM public.user_security_settings 
    WHERE user_id = user_id_val;
    
    RETURN locked_until IS NOT NULL AND locked_until > now();
END;
$function$;

-- Add trigger for updated_at
CREATE TRIGGER update_user_security_settings_updated_at
    BEFORE UPDATE ON public.user_security_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();