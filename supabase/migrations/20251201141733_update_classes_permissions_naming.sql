-- ============================================================================
-- Update Classes Permissions Naming
-- ============================================================================
-- Update permission names from academic.classes.* to classes.* format
-- Update resource column from 'academic' to 'classes'
-- Update all role_permissions entries and assign_default_role_permissions function
-- ============================================================================

-- Step 1: Update permission names and resource column
UPDATE public.permissions
SET 
    name = REPLACE(name, 'academic.classes.', 'classes.'),
    resource = 'classes'
WHERE name LIKE 'academic.classes.%'
  AND organization_id IS NULL;

-- Step 2: Update role_permissions to reference new permission names
-- First, delete old role_permissions entries
DELETE FROM public.role_permissions rp
USING public.permissions p
WHERE rp.permission_id = p.id
  AND p.name LIKE 'academic.classes.%'
  AND p.organization_id IS NULL;

-- Then re-insert with new permission IDs
INSERT INTO public.role_permissions (role, permission_id, organization_id)
SELECT 'super_admin', p.id, NULL
FROM public.permissions p
WHERE p.name LIKE 'classes.%'
  AND p.organization_id IS NULL
ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

-- Update assign_default_role_permissions function to use new permission names
CREATE OR REPLACE FUNCTION public.assign_default_role_permissions(target_org UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Super admin role permissions scoped to organization (read-only mirror)
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'super_admin', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
    ON CONFLICT DO NOTHING;

    -- Admin: full control except destructive org-level settings
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'admin', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'users.read','users.create','users.update','users.delete',
        'buildings.read','buildings.create','buildings.update','buildings.delete',
        'rooms.read','rooms.create','rooms.update','rooms.delete',
        'profiles.read','profiles.update',
        'branding.read','branding.create','branding.update','branding.delete',
        'reports.read','reports.export',
        'auth_monitoring.read','security_monitoring.read',
        'permissions.read','permissions.update',
        'backup.read',
        'academic.residency_types.read','academic.residency_types.create',
        'academic.residency_types.update','academic.residency_types.delete',
        'academic.academic_years.read','academic.academic_years.create',
        'academic.academic_years.update','academic.academic_years.delete',
        'classes.read','classes.create',
        'classes.update','classes.delete',
        'classes.assign','classes.copy'
      )
    ON CONFLICT DO NOTHING;

    -- Teacher-like roles get read-only access plus settings visibility
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT role_name, p.id, target_org
    FROM public.permissions p
    CROSS JOIN (VALUES
        ('teacher'),('staff'),('accountant'),('librarian'),
        ('parent'),('student'),('hostel_manager'),('asset_manager')
    ) AS roles(role_name)
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'buildings.read','rooms.read','profiles.read','reports.read',
        'academic.residency_types.read',
        'academic.academic_years.read',
        'classes.read'
      )
    ON CONFLICT DO NOTHING;
END;
$$;

-- Step 3: Update existing organizations' role_permissions
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM public.organizations WHERE deleted_at IS NULL
    LOOP
        -- Delete old role_permissions for classes
        DELETE FROM public.role_permissions rp
        USING public.permissions p
        WHERE rp.permission_id = p.id
          AND rp.organization_id = org_record.id
          AND p.name LIKE 'academic.classes.%'
          AND p.organization_id IS NULL;

        -- Assign new classes permissions to admin role for this organization
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT 'admin', p.id, org_record.id
        FROM public.permissions p
        WHERE p.organization_id IS NULL
          AND p.name IN (
            'classes.read','classes.create',
            'classes.update','classes.delete',
            'classes.assign','classes.copy'
          )
        ON CONFLICT DO NOTHING;

        -- Assign read permission to teacher-like roles for this organization
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT role_name, p.id, org_record.id
        FROM public.permissions p
        CROSS JOIN (VALUES
            ('teacher'),('staff'),('accountant'),('librarian'),
            ('parent'),('student'),('hostel_manager'),('asset_manager')
        ) AS roles(role_name)
        WHERE p.organization_id IS NULL
          AND p.name = 'classes.read'
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;

