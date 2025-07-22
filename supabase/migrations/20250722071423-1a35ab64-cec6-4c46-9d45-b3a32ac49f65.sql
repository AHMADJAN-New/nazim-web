-- Fix authentication issues comprehensive migration

-- First, ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create missing demo accounts in auth.users first
DO $$
DECLARE
    missing_emails text[] := ARRAY['super.admin@greenvalley.edu', 'pending@greenvalley.edu'];
    email_item text;
    user_exists boolean;
BEGIN
    FOREACH email_item IN ARRAY missing_emails
    LOOP
        -- Check if user exists in auth.users
        SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = email_item) INTO user_exists;
        
        IF NOT user_exists THEN
            -- Insert into auth.users manually with proper metadata
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                confirmation_token,
                confirmed_at,
                recovery_token,
                email_change_token_new,
                email_change,
                last_sign_in_at,
                raw_app_meta_data,
                raw_user_meta_data,
                is_super_admin,
                created_at,
                updated_at,
                phone,
                phone_confirmed_at,
                phone_change,
                phone_change_token,
                email_change_token_current,
                email_change_confirm_status,
                banned_until,
                reauthentication_token,
                reauthentication_sent_at
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                gen_random_uuid(),
                'authenticated',
                'authenticated',
                email_item,
                '$2a$10$8yzXF9mAzexjA6EEQOb5uuO0PDTB1EQ8qzxmWBL.xQhtNDjl7jWre', -- bcrypt for 'admin123'
                NOW(),
                '',
                NOW(),
                '',
                '',
                '',
                NULL,
                '{"provider": "email", "providers": ["email"]}',
                CASE 
                    WHEN email_item = 'super.admin@greenvalley.edu' THEN 
                        '{"full_name": "Super Administrator", "role": "super_admin"}'
                    WHEN email_item = 'pending@greenvalley.edu' THEN 
                        '{"full_name": "Pending User", "role": "student", "school_id": "348b0c64-f47f-4ac0-844f-99438c0c5f51"}'
                END::jsonb,
                false,
                NOW(),
                NOW(),
                NULL,
                NULL,
                '',
                '',
                '',
                0,
                NULL,
                '',
                NULL
            );
            
            RAISE NOTICE 'Created missing user: %', email_item;
        END IF;
    END LOOP;
END $$;

-- Now ensure all demo accounts have correct profiles
INSERT INTO public.profiles (id, email, full_name, role, school_id)
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN au.email = 'super.admin@greenvalley.edu' THEN 'Super Administrator'
    WHEN au.email = 'admin@greenvalley.edu' THEN 'School Administrator'
    WHEN au.email = 'teacher@greenvalley.edu' THEN 'John Teacher'
    WHEN au.email = 'student@greenvalley.edu' THEN 'Sarah Student'
    WHEN au.email = 'parent@greenvalley.edu' THEN 'Parent User'
    WHEN au.email = 'staff@greenvalley.edu' THEN 'Staff Member'
    WHEN au.email = 'pending@greenvalley.edu' THEN 'Pending User'
  END as full_name,
  CASE 
    WHEN au.email = 'super.admin@greenvalley.edu' THEN 'super_admin'::user_role
    WHEN au.email = 'admin@greenvalley.edu' THEN 'admin'::user_role
    WHEN au.email = 'teacher@greenvalley.edu' THEN 'teacher'::user_role
    WHEN au.email = 'student@greenvalley.edu' THEN 'student'::user_role
    WHEN au.email = 'parent@greenvalley.edu' THEN 'parent'::user_role
    WHEN au.email = 'staff@greenvalley.edu' THEN 'staff'::user_role
    WHEN au.email = 'pending@greenvalley.edu' THEN 'student'::user_role
  END as role,
  CASE 
    WHEN au.email = 'super.admin@greenvalley.edu' THEN NULL
    ELSE (SELECT id FROM public.schools WHERE code = 'GVS' LIMIT 1)
  END as school_id
FROM auth.users au
WHERE au.email IN (
  'super.admin@greenvalley.edu',
  'admin@greenvalley.edu', 
  'teacher@greenvalley.edu',
  'student@greenvalley.edu',
  'parent@greenvalley.edu',
  'staff@greenvalley.edu',
  'pending@greenvalley.edu'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  school_id = EXCLUDED.school_id;

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
        user_email,
        ip_address,
        user_agent
    ) VALUES (
        event_type,
        event_data,
        error_message,
        user_email,
        inet_client_addr(),
        current_setting('request.headers', true)::jsonb->>'user-agent'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;