-- Add settings permissions for Settings, Users, Organizations, and Backup modules
-- These permissions are required for the Settings navigation buttons to appear
-- Multi-tenancy: Permissions are global but role assignments respect organization context

-- Insert settings-related permissions (using resource.action format to match navigation checks)
INSERT INTO public.permissions (name, resource, action, description)
VALUES
    -- Settings menu access
    ('settings.read', 'settings', 'read', 'Access to Settings menu and general settings'),
    
    -- User management permissions (already exist but ensuring they're there)
    ('users.read', 'users', 'read', 'View user accounts and profiles'),
    ('users.create', 'users', 'create', 'Create new user accounts'),
    ('users.update', 'users', 'update', 'Update user accounts and profiles'),
    ('users.delete', 'users', 'delete', 'Delete user accounts'),
    
    -- Organization management (already exists but ensuring it's there)
    ('organizations.read', 'organizations', 'read', 'View organizations'),
    ('organizations.create', 'organizations', 'create', 'Create organizations'),
    ('organizations.update', 'organizations', 'update', 'Update organizations'),
    ('organizations.delete', 'organizations', 'delete', 'Delete organizations'),
    
    -- Backup and restore
    ('backup.read', 'backup', 'read', 'Access to Backup and Restore application'),
    ('backup.create', 'backup', 'create', 'Create backups'),
    ('backup.restore', 'backup', 'restore', 'Restore from backups')
ON CONFLICT (name) DO NOTHING;

-- Grant all settings permissions to super_admin role (multi-tenant: super_admin sees all orgs)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 
    'super_admin',
    p.id
FROM public.permissions p
WHERE p.name IN (
    'settings.read',
    'users.read', 'users.create', 'users.update', 'users.delete',
    'organizations.read', 'organizations.create', 'organizations.update', 'organizations.delete',
    'backup.read', 'backup.create', 'backup.restore'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Grant settings permissions to admin role (multi-tenant: admin sees only their org)
-- Admin gets read access to settings, full user management, but no organization management
INSERT INTO public.role_permissions (role, permission_id)
SELECT 
    'admin',
    p.id
FROM public.permissions p
WHERE p.name IN (
    'settings.read',
    'users.read', 'users.create', 'users.update', 'users.delete',
    'backup.read'  -- Admin can view backups but not create/restore (super_admin only)
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Grant basic settings read to other roles (multi-tenant: they see only their org context)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 
    role_name,
    p.id
FROM public.permissions p
CROSS JOIN (VALUES ('teacher'), ('staff'), ('accountant'), ('librarian'), ('parent'), ('student'), ('hostel_manager'), ('asset_manager')) AS roles(role_name)
WHERE p.name = 'settings.read'
ON CONFLICT (role, permission_id) DO NOTHING;




