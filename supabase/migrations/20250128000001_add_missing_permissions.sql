-- Add missing permissions for authentication and user management
-- These permissions are required for the Settings and Authentication navigation items

INSERT INTO public.permissions (name, resource, action, description)
VALUES
    ('users.read', 'users', 'read', 'View user accounts and profiles'),
    ('users.create', 'users', 'create', 'Create new user accounts'),
    ('users.update', 'users', 'update', 'Update user accounts and profiles'),
    ('users.delete', 'users', 'delete', 'Delete user accounts'),
    ('auth_monitoring.read', 'auth_monitoring', 'read', 'View authentication monitoring data'),
    ('security_monitoring.read', 'security_monitoring', 'read', 'View security monitoring data')
ON CONFLICT (name) DO NOTHING;

-- Grant all new permissions to super_admin role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 
    'super_admin',
    p.id
FROM public.permissions p
WHERE p.name IN ('users.read', 'users.create', 'users.update', 'users.delete', 'auth_monitoring.read', 'security_monitoring.read')
ON CONFLICT DO NOTHING;

-- Also grant to admin role (read permissions)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 
    'admin',
    p.id
FROM public.permissions p
WHERE p.name IN ('users.read', 'auth_monitoring.read', 'security_monitoring.read')
ON CONFLICT DO NOTHING;


