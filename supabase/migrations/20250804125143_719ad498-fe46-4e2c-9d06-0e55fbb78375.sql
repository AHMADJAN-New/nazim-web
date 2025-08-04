-- Fix database security issues - Part 2: Complete function fixes and add security features

-- Fix remaining functions
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