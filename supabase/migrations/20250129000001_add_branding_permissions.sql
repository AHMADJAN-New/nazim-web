-- Add branding permissions for RBAC system
INSERT INTO public.permissions (name, resource, action, description)
VALUES
    ('branding.read', 'branding', 'read', 'View school branding settings'),
    ('branding.create', 'branding', 'create', 'Create school branding settings'),
    ('branding.update', 'branding', 'update', 'Update school branding settings'),
    ('branding.delete', 'branding', 'delete', 'Delete school branding settings')
ON CONFLICT (name) DO NOTHING;

-- Grant all branding permissions to super_admin role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 
    'super_admin',
    p.id
FROM public.permissions p
WHERE p.name IN ('branding.read', 'branding.create', 'branding.update', 'branding.delete')
ON CONFLICT DO NOTHING;

-- Grant branding permissions to admin role (read, create, update)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 
    'admin',
    p.id
FROM public.permissions p
WHERE p.name IN ('branding.read', 'branding.create', 'branding.update')
ON CONFLICT DO NOTHING;

