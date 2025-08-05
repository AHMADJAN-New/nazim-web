-- Add missing security functions
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