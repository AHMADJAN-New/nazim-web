-- Migration: Add organization_id to permissions and role_permissions for multi-tenant SaaS support
-- This enables true multi-tenancy where each organization can have different permission assignments

-- ============================================================================
-- 1. ADD organization_id TO permissions TABLE
-- ============================================================================

-- Add organization_id column (NULL = global/system permissions, UUID = org-specific)
ALTER TABLE public.permissions 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_permissions_organization_id ON public.permissions(organization_id);

-- Drop old unique constraint on name
ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_name_key;

-- Add new unique constraint: (name, organization_id) - allows same permission name for different orgs
ALTER TABLE public.permissions 
ADD CONSTRAINT permissions_name_organization_id_key UNIQUE (name, organization_id);

-- ============================================================================
-- 2. ADD organization_id TO role_permissions TABLE
-- ============================================================================

-- Add organization_id column (each org can assign different permissions to roles)
ALTER TABLE public.role_permissions 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_organization_id ON public.role_permissions(organization_id);

-- Drop old unique constraint
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_permission_id_key;

-- Add new unique constraint: (role, permission_id, organization_id)
ALTER TABLE public.role_permissions 
ADD CONSTRAINT role_permissions_role_permission_org_key UNIQUE (role, permission_id, organization_id);

-- ============================================================================
-- 3. UPDATE RLS POLICIES FOR permissions TABLE
-- ============================================================================

-- Drop existing service_role-only policy
DROP POLICY IF EXISTS "Service role full access to permissions" ON public.permissions;

-- Service role still has full access
CREATE POLICY "Service role full access to permissions"
    ON public.permissions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can read:
-- 1. Global permissions (organization_id IS NULL)
-- 2. Permissions for their organization
-- 3. Super admin (organization_id IS NULL) can read all permissions
CREATE POLICY "Authenticated users can read permissions"
    ON public.permissions
    FOR SELECT
    TO authenticated
    USING (
        -- Global permissions (available to all)
        organization_id IS NULL
        OR
        -- Permissions for user's organization
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR
        -- Super admin can read all
        (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL
        AND
        (
            SELECT role 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) = 'super_admin'
    );

-- ============================================================================
-- 4. UPDATE RLS POLICIES FOR role_permissions TABLE
-- ============================================================================

-- Drop existing service_role-only policy
DROP POLICY IF EXISTS "Service role full access to role_permissions" ON public.role_permissions;

-- Service role still has full access
CREATE POLICY "Service role full access to role_permissions"
    ON public.role_permissions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can read:
-- 1. Role permissions for their organization
-- 2. Global role permissions (organization_id IS NULL) - for system-wide roles
-- 3. Super admin can read all role_permissions
CREATE POLICY "Authenticated users can read role_permissions"
    ON public.role_permissions
    FOR SELECT
    TO authenticated
    USING (
        -- Role permissions for user's organization
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR
        -- Global role permissions (organization_id IS NULL)
        organization_id IS NULL
        OR
        -- Super admin can read all
        (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL
        AND
        (
            SELECT role 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) = 'super_admin'
    );

-- ============================================================================
-- 5. CREATE GLOBAL PERMISSIONS (organization_id = NULL)
-- ============================================================================

-- Settings permissions
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('settings.read', 'settings', 'read', 'Access to Settings menu and general settings', NULL),
    ('backup.read', 'backup', 'read', 'Access to Backup and Restore application', NULL),
    ('backup.create', 'backup', 'create', 'Create backups', NULL),
    ('backup.restore', 'backup', 'restore', 'Restore from backups', NULL),
    ('permissions.read', 'permissions', 'read', 'View and manage permissions', NULL),
    ('permissions.update', 'permissions', 'update', 'Update permission assignments', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- User management permissions
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('users.read', 'users', 'read', 'View user accounts and profiles', NULL),
    ('users.create', 'users', 'create', 'Create new user accounts', NULL),
    ('users.update', 'users', 'update', 'Update user accounts and profiles', NULL),
    ('users.delete', 'users', 'delete', 'Delete user accounts', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Organization management permissions (already exist, but ensure they're global)
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('organizations.read', 'organizations', 'read', 'View organizations', NULL),
    ('organizations.create', 'organizations', 'create', 'Create organizations', NULL),
    ('organizations.update', 'organizations', 'update', 'Update organizations', NULL),
    ('organizations.delete', 'organizations', 'delete', 'Delete organizations', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Buildings permissions (already exist, but ensure they're global)
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('buildings.read', 'buildings', 'read', 'View buildings', NULL),
    ('buildings.create', 'buildings', 'create', 'Create buildings', NULL),
    ('buildings.update', 'buildings', 'update', 'Update buildings', NULL),
    ('buildings.delete', 'buildings', 'delete', 'Delete buildings', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Rooms permissions (already exist, but ensure they're global)
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('rooms.read', 'rooms', 'read', 'View rooms', NULL),
    ('rooms.create', 'rooms', 'create', 'Create rooms', NULL),
    ('rooms.update', 'rooms', 'update', 'Update rooms', NULL),
    ('rooms.delete', 'rooms', 'delete', 'Delete rooms', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Profiles permissions (already exist, but ensure they're global)
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('profiles.read', 'profiles', 'read', 'View profiles', NULL),
    ('profiles.update', 'profiles', 'update', 'Update profiles', NULL),
    ('profiles.delete', 'profiles', 'delete', 'Delete profiles', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Branding permissions
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('branding.read', 'branding', 'read', 'View branding settings', NULL),
    ('branding.update', 'branding', 'update', 'Update branding settings', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Reports permissions
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('reports.read', 'reports', 'read', 'View and generate reports', NULL),
    ('reports.export', 'reports', 'export', 'Export reports to PDF/Excel', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Authentication monitoring permissions
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('auth_monitoring.read', 'auth_monitoring', 'read', 'View authentication logs and monitoring', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Security monitoring permissions
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('security_monitoring.read', 'security_monitoring', 'read', 'View security logs and monitoring', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- ============================================================================
-- 6. ASSIGN GLOBAL PERMISSIONS TO ROLES PER ORGANIZATION
-- ============================================================================

-- Helper function to assign permissions to a role for all organizations
CREATE OR REPLACE FUNCTION assign_global_permissions_to_role_for_all_orgs(
    target_role VARCHAR(50),
    permission_resources TEXT[] DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    org_record RECORD;
    perm_record RECORD;
BEGIN
    -- Loop through all organizations
    FOR org_record IN SELECT id FROM public.organizations LOOP
        -- Get all global permissions (or filtered by resources if provided)
        FOR perm_record IN 
            SELECT id FROM public.permissions 
            WHERE organization_id IS NULL
            AND (permission_resources IS NULL OR resource = ANY(permission_resources))
        LOOP
            -- Assign permission to role for this organization
            INSERT INTO public.role_permissions (role, permission_id, organization_id)
            VALUES (target_role, perm_record.id, org_record.id)
            ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Assign all global permissions to super_admin for all organizations
SELECT assign_global_permissions_to_role_for_all_orgs('super_admin');

-- Assign permissions to admin for all organizations (except organizations.*)
-- INCLUDING permissions.* so admins can manage permissions for their organization
SELECT assign_global_permissions_to_role_for_all_orgs('admin', ARRAY[
    'settings', 'backup', 'users', 'buildings', 'rooms', 
    'profiles', 'branding', 'reports', 'auth_monitoring', 'security_monitoring', 'permissions'
]);

-- Assign read permissions to teacher for all organizations
SELECT assign_global_permissions_to_role_for_all_orgs('teacher', ARRAY[
    'buildings', 'rooms', 'profiles'
]);

-- Assign read permissions to staff for all organizations
SELECT assign_global_permissions_to_role_for_all_orgs('staff', ARRAY[
    'buildings', 'rooms', 'profiles'
]);

-- Clean up helper function
DROP FUNCTION IF EXISTS assign_global_permissions_to_role_for_all_orgs;

-- ============================================================================
-- 7. ASSIGN GLOBAL PERMISSIONS TO SUPER_ADMIN (organization_id = NULL)
-- ============================================================================

-- Super admin gets all global permissions with organization_id = NULL in role_permissions
-- This allows super admin to access all permissions across all organizations
INSERT INTO public.role_permissions (role, permission_id, organization_id)
SELECT 'super_admin', id, NULL 
FROM public.permissions 
WHERE organization_id IS NULL
ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

-- ============================================================================
-- 8. MIGRATE EXISTING DATA (if any)
-- ============================================================================

-- Update existing permissions to be global (organization_id = NULL) if not already set
UPDATE public.permissions 
SET organization_id = NULL 
WHERE organization_id IS NULL;

-- Update existing role_permissions to have organization_id = NULL for super_admin
-- This maintains backward compatibility
UPDATE public.role_permissions 
SET organization_id = NULL 
WHERE role = 'super_admin' AND organization_id IS NULL;

-- For other roles, we need to assign permissions per organization
-- This is handled by the function above, but we also need to handle existing data
-- If there are role_permissions without organization_id for non-super-admin roles,
-- we should assign them to all organizations or remove them
-- For now, we'll leave them as-is and let the application handle it

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.permissions.organization_id IS 
    'NULL = global/system permission (available to all organizations), UUID = organization-specific permission';

COMMENT ON COLUMN public.role_permissions.organization_id IS 
    'NULL = global role permission (for super_admin), UUID = organization-specific role permission assignment';

