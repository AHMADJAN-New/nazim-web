-- Test script to verify permissions are set up correctly
-- Run this in Supabase SQL Editor

-- 1. Check if permissions exist
SELECT name, resource, action, description 
FROM permissions 
WHERE name IN ('settings.read', 'backup.read', 'users.read', 'organizations.read')
ORDER BY name;

-- 2. Check role_permissions assignments
SELECT 
    rp.role,
    p.name as permission_name,
    p.resource,
    p.action
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE p.name IN ('settings.read', 'backup.read', 'users.read', 'organizations.read')
ORDER BY rp.role, p.name;

-- 3. Check what roles exist in profiles
SELECT DISTINCT role, COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY role;

-- 4. Check a specific user's role (replace with your user ID)
-- SELECT id, role, organization_id, full_name, email
-- FROM profiles
-- WHERE email = 'your-email@example.com';

