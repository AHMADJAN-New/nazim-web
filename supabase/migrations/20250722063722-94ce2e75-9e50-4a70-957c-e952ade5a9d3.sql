-- Insert missing demo users into auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
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
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
) VALUES 
-- Super Admin
(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'super.admin@greenvalley.edu',
    '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', -- bcrypt hash for 'admin123'
    now(),
    '',
    now(),
    '',
    null,
    '',
    '',
    null,
    null,
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Super Administrator", "role": "super_admin"}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null
),
-- Pending User
(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'pending@greenvalley.edu',
    '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', -- bcrypt hash for 'admin123'
    now(),
    '',
    now(),
    '',
    null,
    '',
    '',
    null,
    null,
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Pending User", "role": "pending"}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null
)
ON CONFLICT (email) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    updated_at = now();

-- Update existing demo accounts with correct password hash
UPDATE auth.users 
SET 
    encrypted_password = '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', -- bcrypt hash for 'admin123'
    updated_at = now()
WHERE email IN (
    'admin@greenvalley.edu',
    'teacher@greenvalley.edu',
    'student@greenvalley.edu',
    'parent@greenvalley.edu',
    'staff@greenvalley.edu'
);

-- Insert missing profiles
INSERT INTO public.profiles (id, email, full_name, role, school_id)
SELECT 
    u.id,
    u.email,
    CASE 
        WHEN u.email = 'super.admin@greenvalley.edu' THEN 'Super Administrator'
        WHEN u.email = 'pending@greenvalley.edu' THEN 'Pending User'
    END,
    CASE 
        WHEN u.email = 'super.admin@greenvalley.edu' THEN 'super_admin'::user_role
        WHEN u.email = 'pending@greenvalley.edu' THEN 'student'::user_role -- Default role for pending
    END,
    (SELECT id FROM schools WHERE code = 'GVS001' LIMIT 1)
FROM auth.users u
WHERE u.email IN ('super.admin@greenvalley.edu', 'pending@greenvalley.edu')
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);