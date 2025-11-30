-- Seed core data: permissions, default role assignments, sample organizations, and dev helpers
SET statement_timeout = 0;
SET lock_timeout = 0;
-- ============================================================================
-- Permission catalog (global = organization_id NULL)
-- ============================================================================
INSERT INTO public.permissions (name, resource, action, description, organization_id)
VALUES
    ('organizations.read', 'organizations', 'read', 'View organizations', NULL),
    ('organizations.create', 'organizations', 'create', 'Create organizations', NULL),
    ('organizations.update', 'organizations', 'update', 'Update organizations', NULL),
    ('organizations.delete', 'organizations', 'delete', 'Delete organizations', NULL),
    ('buildings.read', 'buildings', 'read', 'View buildings', NULL),
    ('buildings.create', 'buildings', 'create', 'Create buildings', NULL),
    ('buildings.update', 'buildings', 'update', 'Update buildings', NULL),
    ('buildings.delete', 'buildings', 'delete', 'Delete buildings', NULL),
    ('rooms.read', 'rooms', 'read', 'View rooms', NULL),
    ('rooms.create', 'rooms', 'create', 'Create rooms', NULL),
    ('rooms.update', 'rooms', 'update', 'Update rooms', NULL),
    ('rooms.delete', 'rooms', 'delete', 'Delete rooms', NULL),
    ('profiles.read', 'profiles', 'read', 'View profiles', NULL),
    ('profiles.update', 'profiles', 'update', 'Update profiles', NULL),
    ('profiles.delete', 'profiles', 'delete', 'Delete profiles', NULL),
    ('permissions.read', 'permissions', 'read', 'View permissions catalog', NULL),
    ('permissions.update', 'permissions', 'update', 'Update permission assignments', NULL),
    ('branding.read', 'branding', 'read', 'View branding settings', NULL),
    ('branding.create', 'branding', 'create', 'Create branding settings', NULL),
    ('branding.update', 'branding', 'update', 'Update branding settings', NULL),
    ('branding.delete', 'branding', 'delete', 'Delete branding settings', NULL),
    ('users.read', 'users', 'read', 'View user accounts and profiles', NULL),
    ('users.create', 'users', 'create', 'Create user accounts', NULL),
    ('users.update', 'users', 'update', 'Update user accounts', NULL),
    ('users.delete', 'users', 'delete', 'Delete user accounts', NULL),
    ('settings.read', 'settings', 'read', 'Access Settings area', NULL),
    ('backup.read', 'backup', 'read', 'Access backup console', NULL),
    ('backup.create', 'backup', 'create', 'Create backups', NULL),
    ('backup.restore', 'backup', 'restore', 'Restore from backups', NULL),
    ('reports.read', 'reports', 'read', 'View/generate reports', NULL),
    ('reports.export', 'reports', 'export', 'Export reports', NULL),
    ('auth_monitoring.read', 'auth_monitoring', 'read', 'View authentication monitoring data', NULL),
    ('security_monitoring.read', 'security_monitoring', 'read', 'View security monitoring data', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;
-- Give super_admin global (organization_id NULL) access to every permission
INSERT INTO public.role_permissions (role, permission_id, organization_id)
SELECT 'super_admin', id, NULL
FROM public.permissions
WHERE organization_id IS NULL
ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
-- ============================================================================
-- Sample organizations and schools for local development
-- ============================================================================
INSERT INTO public.organizations (name, slug, settings)
VALUES
    ('Test School', 'test-school', '{"theme":"default"}'::jsonb),
    ('Demo Academy', 'demo-academy', '{"theme":"blue"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
-- Ensure each organization has at least one school
INSERT INTO public.school_branding (
    organization_id, school_name, school_address, school_phone, is_active
)
SELECT o.id, o.name || ' Main Campus', 'Main street', '+93-000-000-0000', TRUE
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM public.school_branding sb WHERE sb.organization_id = o.id
);
-- Seed one building per school
INSERT INTO public.buildings (building_name, school_id)
SELECT 'Main Building', sb.id
FROM public.school_branding sb
WHERE NOT EXISTS (
    SELECT 1 FROM public.buildings b WHERE b.school_id = sb.id AND b.building_name = 'Main Building'
);
-- Seed a couple of rooms for each building
INSERT INTO public.rooms (room_number, building_id, school_id)
SELECT '101', b.id, b.school_id
FROM public.buildings b
WHERE NOT EXISTS (
    SELECT 1 FROM public.rooms r WHERE r.building_id = b.id AND r.room_number = '101'
);
INSERT INTO public.rooms (room_number, building_id, school_id)
SELECT '102', b.id, b.school_id
FROM public.buildings b
WHERE NOT EXISTS (
    SELECT 1 FROM public.rooms r WHERE r.building_id = b.id AND r.room_number = '102'
);
-- ============================================================================
-- Development admin (email: admin@nazim.local / password: Admin123!@#)
-- ============================================================================
DO $$
DECLARE
    admin_email TEXT := 'admin@nazim.local';
    admin_password TEXT := 'Admin123!@#';
    admin_name TEXT := 'Super Admin';
    existing_user UUID;
    new_id UUID;
    first_org_id UUID;
BEGIN
    -- Get first organization (or create one if none exists)
    SELECT id INTO first_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    
    IF first_org_id IS NULL THEN
        -- Create a default organization if none exists
        INSERT INTO public.organizations (name, slug, settings)
        VALUES ('Default Organization', 'default-org', '{"theme":"default"}'::jsonb)
        RETURNING id INTO first_org_id;
    END IF;
    
    SELECT id INTO existing_user FROM auth.users WHERE email = admin_email;
    IF existing_user IS NULL THEN
        new_id := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_id,
            'authenticated',
            'authenticated',
            admin_email,
            crypt(admin_password, gen_salt('bf', 10)),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('role','admin','full_name',admin_name,'organization_id',first_org_id),
            NOW(),
            NOW()
        )
        RETURNING id INTO existing_user;
    END IF;
    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    VALUES (existing_user, admin_email, admin_name, 'admin', first_org_id)
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin', 
        organization_id = COALESCE(profiles.organization_id, first_org_id), 
        deleted_at = NULL;
END;
$$;

-- Normalize auth token columns to non-null strings for GoTrue
-- Some Supabase GoTrue versions expect certain VARCHAR columns to be empty strings, not NULL.
-- Ensure any NULL values are converted to empty strings to avoid scan errors.
UPDATE auth.users
SET
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  recovery_token = COALESCE(recovery_token, ''),
  confirmation_token = COALESCE(confirmation_token, '')
WHERE
  email_change IS NULL
  OR email_change_token_new IS NULL
  OR recovery_token IS NULL
  OR confirmation_token IS NULL;
