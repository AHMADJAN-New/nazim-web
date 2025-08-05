-- Add user security settings table and functions
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