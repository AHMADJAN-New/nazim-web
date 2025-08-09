-- Development seed data for demo accounts

-- Ensure default school exists
INSERT INTO public.schools (code, name, is_active)
VALUES ('GVS', 'Green Valley School', true)
ON CONFLICT (code) DO NOTHING;

-- Common password hash for 'admin123'
-- Seed demo users
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
    -- Super Administrator
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'super.admin@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Super Administrator", "role": "super_admin"}', true, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
    -- School Administrator
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "School Administrator", "role": "admin"}', false, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
    -- Teacher
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'teacher@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "John Teacher", "role": "teacher"}', false, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
    -- Student
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'student@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Sarah Student", "role": "student"}', false, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
    -- Parent
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'parent@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Parent User", "role": "parent"}', false, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
    -- Staff
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'staff@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Staff Member", "role": "staff"}', false, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
    -- Pending User
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'pending@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Pending User", "role": "pending"}', false, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL)
ON CONFLICT (email) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, updated_at = now();

-- Create profiles for demo users
INSERT INTO public.profiles (id, email, full_name, role, school_id)
SELECT
    u.id,
    u.email,
    CASE
        WHEN u.email = 'super.admin@greenvalley.edu' THEN 'Super Administrator'
        WHEN u.email = 'admin@greenvalley.edu' THEN 'School Administrator'
        WHEN u.email = 'teacher@greenvalley.edu' THEN 'John Teacher'
        WHEN u.email = 'student@greenvalley.edu' THEN 'Sarah Student'
        WHEN u.email = 'parent@greenvalley.edu' THEN 'Parent User'
        WHEN u.email = 'staff@greenvalley.edu' THEN 'Staff Member'
        WHEN u.email = 'pending@greenvalley.edu' THEN 'Pending User'
    END AS full_name,
    CASE
        WHEN u.email = 'super.admin@greenvalley.edu' THEN 'super_admin'::user_role
        WHEN u.email = 'admin@greenvalley.edu' THEN 'admin'::user_role
        WHEN u.email = 'teacher@greenvalley.edu' THEN 'teacher'::user_role
        WHEN u.email = 'student@greenvalley.edu' THEN 'student'::user_role
        WHEN u.email = 'parent@greenvalley.edu' THEN 'parent'::user_role
        WHEN u.email = 'staff@greenvalley.edu' THEN 'staff'::user_role
        WHEN u.email = 'pending@greenvalley.edu' THEN 'student'::user_role
    END AS role,
    s.id AS school_id
FROM auth.users u
CROSS JOIN LATERAL (
    SELECT id FROM public.schools WHERE code = 'GVS' LIMIT 1
) s
WHERE u.email IN (
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
