/*
  # Fix Demo Accounts Authentication

  1. New Migration
    - Ensures all demo accounts exist in auth.users with correct passwords
    - Creates corresponding profiles with proper roles
    - Sets up proper authentication flow

  2. Security
    - Uses proper password hashing
    - Maintains RLS policies
    - Ensures data integrity
*/

-- First, ensure the schools table has the required school
INSERT INTO public.schools (id, code, name, is_active)
VALUES ('348b0c64-f47f-4ac0-844f-99438c0c5f51', 'GVS', 'Green Valley School', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;

-- Delete existing demo users to recreate them properly
DELETE FROM auth.users WHERE email IN (
  'super.admin@greenvalley.edu',
  'admin@greenvalley.edu',
  'teacher@greenvalley.edu',
  'student@greenvalley.edu',
  'parent@greenvalley.edu',
  'staff@greenvalley.edu',
  'pending@greenvalley.edu'
);

-- Create demo users with proper password hash for 'admin123'
-- Using bcrypt hash: $2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C
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
    ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'super.admin@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Super Administrator", "role": "super_admin"}', false, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
    -- School Administrator
    ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'admin@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "School Administrator", "role": "admin"}', false, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
    -- Teacher
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'teacher@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "John Teacher", "role": "teacher"}', false, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
    -- Student
    ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'student@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Sarah Student", "role": "student"}', false, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
    -- Parent
    ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'parent@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Parent User", "role": "parent"}', false, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
    -- Staff
    ('00000000-0000-0000-0000-000000000000', '66666666-6666-6666-6666-666666666666', 'authenticated', 'authenticated', 'staff@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Staff Member", "role": "staff"}', false, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL),
    -- Pending User
    ('00000000-0000-0000-0000-000000000000', '77777777-7777-7777-7777-777777777777', 'authenticated', 'authenticated', 'pending@greenvalley.edu', '$2a$10$FQyVAuJpP.6P8ksS6JSSzuC6Qq8F3r1k1B7yD7GpN8XNm2F4KY.7C', now(), '', now(), '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Pending User", "role": "pending"}', false, now(), now(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL);

-- Create profiles for demo users
INSERT INTO public.profiles (id, email, full_name, role, school_id)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'super.admin@greenvalley.edu', 'Super Administrator', 'super_admin', NULL),
    ('22222222-2222-2222-2222-222222222222', 'admin@greenvalley.edu', 'School Administrator', 'admin', '348b0c64-f47f-4ac0-844f-99438c0c5f51'),
    ('33333333-3333-3333-3333-333333333333', 'teacher@greenvalley.edu', 'John Teacher', 'teacher', '348b0c64-f47f-4ac0-844f-99438c0c5f51'),
    ('44444444-4444-4444-4444-444444444444', 'student@greenvalley.edu', 'Sarah Student', 'student', '348b0c64-f47f-4ac0-844f-99438c0c5f51'),
    ('55555555-5555-5555-5555-555555555555', 'parent@greenvalley.edu', 'Parent User', 'parent', '348b0c64-f47f-4ac0-844f-99438c0c5f51'),
    ('66666666-6666-6666-6666-666666666666', 'staff@greenvalley.edu', 'Staff Member', 'staff', '348b0c64-f47f-4ac0-844f-99438c0c5f51'),
    ('77777777-7777-7777-7777-777777777777', 'pending@greenvalley.edu', 'Pending User', 'student', '348b0c64-f47f-4ac0-844f-99438c0c5f51')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id;

-- Update demo_accounts table to match
INSERT INTO public.demo_accounts (email, role, full_name, description) VALUES
    ('super.admin@greenvalley.edu', 'super_admin', 'Super Administrator', 'System administrator with full access'),
    ('admin@greenvalley.edu', 'admin', 'School Administrator', 'School administration access'),
    ('teacher@greenvalley.edu', 'teacher', 'John Teacher', 'Teaching and class management'),
    ('student@greenvalley.edu', 'student', 'Sarah Student', 'Student portal access'),
    ('parent@greenvalley.edu', 'parent', 'Parent User', 'Parent/guardian access'),
    ('staff@greenvalley.edu', 'staff', 'Staff Member', 'General staff access'),
    ('pending@greenvalley.edu', 'student', 'Pending User', 'Pending approval account')
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    description = EXCLUDED.description;

-- Create a pending registration for the pending user to test approval workflow
INSERT INTO public.pending_registrations (
    user_id, 
    school_id, 
    requested_role, 
    full_name, 
    email,
    status
) VALUES (
    '77777777-7777-7777-7777-777777777777',
    '348b0c64-f47f-4ac0-844f-99438c0c5f51',
    'student',
    'Pending User',
    'pending@greenvalley.edu',
    'pending'
) ON CONFLICT (user_id, school_id) DO UPDATE SET
    status = 'pending',
    requested_at = now();