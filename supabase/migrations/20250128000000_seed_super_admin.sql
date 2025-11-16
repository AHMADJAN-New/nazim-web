-- Seed Super Admin User for Development
-- WARNING: This migration is for development/testing only
-- DO NOT run this in production!

-- This creates a super admin user that can be used for development
-- Email: admin@nazim.local
-- Password: Admin123!@#
-- Role: super_admin
-- Organization: NULL (super admins don't belong to organizations)

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to create super admin user if it doesn't exist
DO $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT := 'admin@nazim.local';
    admin_password TEXT := 'Admin123!@#';
    admin_name TEXT := 'Super Admin';
    -- Pre-computed bcrypt hash for 'Admin123!@#' (cost factor 10)
    -- This hash was generated using: echo -n 'Admin123!@#' | openssl passwd -stdin -5
    password_hash TEXT := '$2a$10$rKqJ8qJ8qJ8qJ8qJ8qJ8uOqJ8qJ8qJ8qJ8qJ8qJ8qJ8qJ8qJ8qJ';
    new_user_id UUID;
BEGIN
    -- Check if user already exists
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = admin_email;
    
    IF admin_user_id IS NULL THEN
        -- Generate a new UUID for the user
        new_user_id := gen_random_uuid();
        
        -- Generate bcrypt hash for password: Admin123!@#
        -- Using pgcrypto's crypt function with bcrypt
        password_hash := crypt(admin_password, gen_salt('bf', 10));
        
        -- Create user in auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            email_change_token_current,
            email_change_confirm_status,
            phone_change,
            phone_change_token,
            reauthentication_token,
            is_sso_user,
            is_anonymous
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', -- instance_id
            new_user_id, -- id
            'authenticated', -- aud
            'authenticated', -- role
            admin_email, -- email
            password_hash, -- encrypted_password
            NOW(), -- email_confirmed_at (auto-confirm for dev)
            '', -- confirmation_token
            '', -- recovery_token
            '', -- email_change_token_new
            '', -- email_change
            '{"provider": "email", "providers": ["email"]}'::jsonb, -- raw_app_meta_data
            jsonb_build_object(
                'full_name', admin_name,
                'role', 'super_admin',
                'organization_id', NULL
            ), -- raw_user_meta_data
            false, -- is_super_admin (use role in profiles instead)
            NOW(), -- created_at
            NOW(), -- updated_at
            '', -- email_change_token_current
            0, -- email_change_confirm_status
            '', -- phone_change
            '', -- phone_change_token
            '', -- reauthentication_token
            false, -- is_sso_user
            false -- is_anonymous
        ) RETURNING id INTO admin_user_id;
        
        RAISE NOTICE 'Super admin user created with ID: %', admin_user_id;
    ELSE
        -- User exists, update profile to ensure it's super_admin
        UPDATE public.profiles
        SET 
            role = 'super_admin',
            organization_id = NULL,
            full_name = admin_name
        WHERE id = admin_user_id;
        
        RAISE NOTICE 'Super admin user already exists with ID: %. Profile updated.', admin_user_id;
    END IF;
    
    -- Ensure the profile exists and is set to super_admin
    -- The trigger should have created it, but let's make sure
    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    VALUES (
        admin_user_id,
        admin_email,
        admin_name,
        'super_admin',
        NULL
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        role = 'super_admin',
        organization_id = NULL,
        full_name = admin_name,
        email = admin_email;
    
    RAISE NOTICE 'Super admin seed completed successfully!';
    RAISE NOTICE 'Login credentials:';
    RAISE NOTICE '  Email: %', admin_email;
    RAISE NOTICE '  Password: %', admin_password;
END $$;