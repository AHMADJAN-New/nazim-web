-- ============================================================================
-- Update assign_default_role_permissions to Remove Global Super Admin Permissions
-- ============================================================================
-- Super admin should only get org-scoped permissions, not global (NULL) permissions.
-- This ensures super admin uses the permission system like all other roles.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_default_role_permissions(target_org UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    perm_record RECORD;
BEGIN
    -- Super admin: ALL permissions for the target organization (org-scoped only, no global NULL)
    FOR perm_record IN SELECT id FROM public.permissions WHERE organization_id IS NULL LOOP
        -- Only org-scoped access (no global NULL permissions)
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        VALUES ('super_admin', perm_record.id, target_org)
        ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
    END LOOP;

    -- Admin: ALL global permissions for their organization
    FOR perm_record IN SELECT id FROM public.permissions WHERE organization_id IS NULL LOOP
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        VALUES ('admin', perm_record.id, target_org)
        ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
    END LOOP;

    -- Teacher: read-only access to academic data
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'teacher', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'students.read',
        'classes.read',
        'subjects.read',
        'academic_years.read',
        'class_subjects.read',
        'class_academic_years.read',
        'teacher_subject_assignments.read',
        'schedule_slots.read',
        'timetables.read',
        'residency_types.read',
        'profiles.read',
        'rooms.read',
        'buildings.read',
        'branding.read',
        'attendance.read',
        'attendance.create',
        'attendance.update'
      )
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

    -- Staff: basic read access (specific permissions per user via user_permissions)
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'staff', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'students.read',
        'classes.read',
        'academic_years.read',
        'profiles.read',
        'rooms.read',
        'buildings.read',
        'branding.read'
      )
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

    -- Student: very limited access (only their own data)
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'student', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'profiles.read',
        'branding.read'
      )
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

    -- Parent: limited access to child's data
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'parent', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'students.read',
        'profiles.read',
        'branding.read',
        'attendance.read'
      )
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.assign_default_role_permissions(UUID) IS 
'Assigns comprehensive default permissions to roles for an organization. Super admin gets all permissions for the organization (org-scoped only, no global NULL permissions). Admin gets all permissions. Staff get basic read access (use user_permissions for specific staff roles). Teacher, student, parent get role-appropriate access.';

