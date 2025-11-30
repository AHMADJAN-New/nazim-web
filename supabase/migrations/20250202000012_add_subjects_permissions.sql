-- ============================================================================
-- Add Subjects Permissions
-- ============================================================================
-- Add permissions for subjects management and assign to roles
-- ============================================================================

-- Insert subjects permissions (global = organization_id NULL)
INSERT INTO
    public.permissions (
        name,
        resource,
        action,
        description,
        organization_id
    )
VALUES (
        'academic.subjects.read',
        'academic',
        'read',
        'View subjects',
        NULL
    ),
    (
        'academic.subjects.create',
        'academic',
        'create',
        'Create subjects',
        NULL
    ),
    (
        'academic.subjects.update',
        'academic',
        'update',
        'Update subjects',
        NULL
    ),
    (
        'academic.subjects.delete',
        'academic',
        'delete',
        'Delete subjects',
        NULL
    ),
    (
        'academic.subjects.assign',
        'academic',
        'assign',
        'Assign subjects to classes',
        NULL
    ),
    (
        'academic.subjects.copy',
        'academic',
        'copy',
        'Copy subjects between academic years',
        NULL
    ) ON CONFLICT (name, organization_id) DO NOTHING;

-- Give super_admin global (organization_id NULL) access to all subjects permissions
INSERT INTO
    public.role_permissions (
        role,
        permission_id,
        organization_id
    )
SELECT 'super_admin', id, NULL
FROM public.permissions
WHERE
    name LIKE 'academic.subjects.%'
    AND organization_id IS NULL ON CONFLICT (
        role,
        permission_id,
        organization_id
    ) DO NOTHING;

-- Update assign_default_role_permissions function to include subjects permissions
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
        'academic.classes.read','academic.classes.create',
        'academic.classes.update','academic.classes.delete',
        'academic.classes.assign','academic.classes.copy',
        'academic.subjects.read','academic.subjects.create',
        'academic.subjects.update','academic.subjects.delete',
        'academic.subjects.assign','academic.subjects.copy'
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
        'academic.classes.read',
        'academic.subjects.read'
      )
    ON CONFLICT DO NOTHING;
END;
$$;

-- Assign subjects permissions to existing organizations' admin roles
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM public.organizations WHERE deleted_at IS NULL
    LOOP
        -- Assign subjects permissions to admin role for this organization
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT 'admin', p.id, org_record.id
        FROM public.permissions p
        WHERE p.organization_id IS NULL
          AND p.name IN (
            'academic.subjects.read','academic.subjects.create',
            'academic.subjects.update','academic.subjects.delete',
            'academic.subjects.assign','academic.subjects.copy'
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
          AND p.name = 'academic.subjects.read'
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;

